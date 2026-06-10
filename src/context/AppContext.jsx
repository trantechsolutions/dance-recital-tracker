import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth, db, authorizedUsers, coll } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { MULTI_STUDIO_ENABLED, DEFAULT_ORG_ID } from '../config';

const AppContext = createContext();

export function AppProvider({ children }) {
  // --- Global State ---
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isStudioAdmin, setIsStudioAdmin] = useState(false);

  // Derived — no independent state; eliminates the dual-writer race
  const isAuthorized = useMemo(() => isSuperAdmin || isStudioAdmin, [isSuperAdmin, isStudioAdmin]);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [hasSkippedLogin, setHasSkippedLogin] = useState(() => localStorage.getItem('hasSkippedLogin') === 'true');
  const [favorites, setFavorites] = useState(new Set());
  const [orgId, setOrgId] = useState(() => {
    // Single-studio mode: a configured default org is authoritative (overrides
    // any stale localStorage value from a prior multi-studio session).
    if (!MULTI_STUDIO_ENABLED && DEFAULT_ORG_ID) return DEFAULT_ORG_ID;
    return localStorage.getItem('selectedOrgId') || null;
  });
  // True once single-studio org resolution has finished (success or empty result),
  // so the UI can distinguish "resolving" from "no studio configured".
  const [orgResolveAttempted, setOrgResolveAttempted] = useState(MULTI_STUDIO_ENABLED);
  const [orgName, setOrgName] = useState('');
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  // --- Auth & Favorites Sync ---
  useEffect(() => {
    let isMounted = true;

    // Safety timeout — if auth still hasn't resolved after 5s, unlock the UI
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        console.warn("[Auth] Safety timeout reached — unlocking UI");
        setIsAuthChecking(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          await handleUserLogin(firebaseUser);
        } else {
          setUser(null);
          setIsSuperAdmin(false);
          setIsStudioAdmin(false);
          setFavorites(new Set());
        }
      } catch (err) {
        console.error("[Auth] onAuthStateChanged error:", err);
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimer);
          setIsAuthChecking(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const handleUserLogin = async (u) => {
    setUser(u);
    const isSuper = u && authorizedUsers.includes(u.email);
    setIsSuperAdmin(isSuper);

    // Fetch user profile & favorites
    const profileRef = doc(db, coll('user_profiles'), u.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists() && profileSnap.data().favorites) {
      setFavorites(new Set(profileSnap.data().favorites));
    } else {
      setFavorites(new Set());
    }

    // Upsert user profile with login timestamp
    await setDoc(profileRef, {
      email: u.email,
      last_login: new Date().toISOString()
    }, { merge: true });
  };

  // --- Org ID Sync ---
  useEffect(() => {
    if (orgId) {
      localStorage.setItem('selectedOrgId', orgId);
    } else {
      localStorage.removeItem('selectedOrgId');
      setOrgName('');
      setIsStudioAdmin(false);
    }
  }, [orgId]);

  // --- Single-Studio Org Auto-Resolution (ADR-002) ---
  // Precedence: DEFAULT_ORG_ID → localStorage (handled in initial state) →
  // first organizations doc sorted by id → unconfigured (orgResolveAttempted=true).
  useEffect(() => {
    if (MULTI_STUDIO_ENABLED || orgId) return;
    if (DEFAULT_ORG_ID) {
      setOrgId(DEFAULT_ORG_ID);
      setOrgResolveAttempted(true);
      return;
    }
    let cancelled = false;
    const resolveOrg = async () => {
      try {
        const snap = await getDocs(collection(db, coll('organizations')));
        if (!cancelled && !snap.empty) {
          const first = [...snap.docs].sort((a, b) => a.id.localeCompare(b.id))[0];
          setOrgId(first.id);
        }
      } catch (err) {
        console.error('[Org] Auto-resolve failed:', err);
      } finally {
        if (!cancelled) setOrgResolveAttempted(true);
      }
    };
    resolveOrg();
    return () => { cancelled = true; };
  }, [orgId]);

  // --- Org Name + Studio Admin Check ---
  useEffect(() => {
    if (!orgId) return;
    const fetchOrg = async () => {
      try {
        const snap = await getDoc(doc(db, coll('organizations'), orgId));
        if (!snap.exists()) return;
        const data = snap.data();
        setOrgName(data.name || '');
        const studioAdmin = !!(user && data.admins?.includes(user.email));
        setIsStudioAdmin(studioAdmin);
      } catch (err) {
        console.error('[Org] Failed to fetch org:', err);
      }
    };
    fetchOrg();
  }, [orgId, user]);

  // --- Actions ---
  const toggleFavorite = async (name) => {
    if (!user) {
      setLoginPromptOpen(true);
      return false;
    }

    // Capture previous state for rollback
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);

      const newFavArray = Array.from(next);
      const profileRef = doc(db, coll('user_profiles'), user.uid);
      setDoc(profileRef, { favorites: newFavArray }, { merge: true })
        .catch(() => {
          // Roll back optimistic update on write failure
          setFavorites(prev);
        });

      return next;
    });
    return true;
  };

  const skipLogin = () => {
    setHasSkippedLogin(true);
    localStorage.setItem('hasSkippedLogin', 'true');
  };

  const clearSkipLogin = () => {
    setHasSkippedLogin(false);
    localStorage.removeItem('hasSkippedLogin');
  };

  const value = {
    user, isAuthorized, isSuperAdmin, isStudioAdmin, isAuthChecking,
    hasSkippedLogin, skipLogin, clearSkipLogin,
    favorites, toggleFavorite,
    orgId, setOrgId, orgName, orgResolveAttempted,
    loginPromptOpen, setLoginPromptOpen,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  return useContext(AppContext);
};
