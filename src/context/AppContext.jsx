import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { auth, db, authorizedUsers, coll } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
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
  // Private per-dancer-per-act notes (outfit/hairstyle, etc.), keyed by
  // `${showId}::${actNumber}::${dancer}`. Stored on the user's own profile.
  const [dancerNotes, setDancerNotes] = useState({});
  const [orgId, setOrgId] = useState(() => {
    // Single-studio mode: a configured default org is authoritative (overrides
    // any stale localStorage value from a prior multi-studio session).
    if (!MULTI_STUDIO_ENABLED && DEFAULT_ORG_ID) return DEFAULT_ORG_ID;
    return localStorage.getItem('selectedOrgId') || null;
  });
  // True once single-studio org resolution has finished (success or empty result),
  // so the UI can distinguish "resolving" from "no studio configured".
  const [orgResolveAttempted, setOrgResolveAttempted] = useState(MULTI_STUDIO_ENABLED);
  // Set when DEFAULT_ORG_ID points at a nonexistent org doc, so resolution
  // falls through to the first real org instead of re-pinning a bad config.
  const invalidDefaultOrg = useRef(false);
  const [orgName, setOrgName] = useState('');
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  // "How to use" tutorial. The 'general' variant is the user-facing tour that
  // auto-opens once on first run (tracked in localStorage); the 'admin' variant
  // is launched on demand from the admin panel's help (?) button and explains
  // the admin console only.
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialVariant, setTutorialVariant] = useState('general');

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
          setDancerNotes({});
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

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      setFavorites(new Set(data.favorites || []));
      setDancerNotes(data.dancerNotes || {});
    } else {
      setFavorites(new Set());
      setDancerNotes({});
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
    if (DEFAULT_ORG_ID && !invalidDefaultOrg.current) {
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
        if (!snap.exists()) {
          // orgId points at a nonexistent org (stale localStorage, bad deep
          // link, or misconfigured VITE_DEFAULT_ORG_ID). Clear it so admin
          // writes can't land under a phantom studio; resolution recovers
          // with a real org on the next pass.
          console.warn(`[Org] No organization doc for "${orgId}" — clearing selection`);
          if (DEFAULT_ORG_ID && orgId === DEFAULT_ORG_ID) {
            invalidDefaultOrg.current = true;
            console.error(`[Org] VITE_DEFAULT_ORG_ID="${DEFAULT_ORG_ID}" has no doc in "${coll('organizations')}" — falling back to auto-resolution`);
          }
          setOrgId(null);
          setOrgResolveAttempted(false);
          return;
        }
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

  // Add, update, or (with empty text) clear a private note for one dancer in
  // one act. Writes the whole map via updateDoc so cleared keys are removed —
  // a setDoc merge would deep-merge and leave stale keys behind. Optimistic
  // with rollback, mirroring toggleFavorite.
  const setDancerNote = async (key, text) => {
    if (!user) {
      setLoginPromptOpen(true);
      return false;
    }
    const trimmed = (text || '').trim().slice(0, 500);
    setDancerNotes(prev => {
      const next = { ...prev };
      if (trimmed) next[key] = trimmed;
      else delete next[key];

      const profileRef = doc(db, coll('user_profiles'), user.uid);
      updateDoc(profileRef, { dancerNotes: next })
        .catch(() =>
          // Doc may not exist yet (first write) — create it, then fall back
          // to rollback if that fails too.
          setDoc(profileRef, { dancerNotes: next }, { merge: true })
            .catch(() => setDancerNotes(prev))
        );

      return next;
    });
    return true;
  };

  const skipLogin = () => {
    setHasSkippedLogin(true);
    localStorage.setItem('hasSkippedLogin', 'true');
  };

  // --- Tutorial ---
  const TUTORIAL_SEEN_KEY = 'tutorialSeen_v1';
  // True the very first time a visitor reaches the app (no dismissal stored).
  const tutorialNeverSeen = () => !localStorage.getItem(TUTORIAL_SEEN_KEY);
  // Explicit re-trigger (admin "?" help, Settings replay, dev-tools preview).
  // Does not touch the localStorage flag — only dismissal of the general tour
  // records that.
  const openTutorial = (variant = 'general') => {
    setTutorialVariant(variant === 'admin' ? 'admin' : 'general');
    setShowTutorial(true);
  };
  // Close. Only the general (user-facing) tour records the first-run flag so it
  // never auto-opens again; the on-demand admin tour leaves it untouched.
  const dismissTutorial = () => {
    if (tutorialVariant === 'general') {
      localStorage.setItem(TUTORIAL_SEEN_KEY, new Date().toISOString());
    }
    setShowTutorial(false);
  };
  // Clear the "seen" flag so the genuine first-run auto-open fires again on the
  // next load — lets an admin test the real first-time experience, not just the
  // replay.
  const resetTutorial = () => {
    localStorage.removeItem(TUTORIAL_SEEN_KEY);
    setShowTutorial(false);
  };

  const clearSkipLogin = () => {
    setHasSkippedLogin(false);
    localStorage.removeItem('hasSkippedLogin');
  };

  const value = {
    user, isAuthorized, isSuperAdmin, isStudioAdmin, isAuthChecking,
    hasSkippedLogin, skipLogin, clearSkipLogin,
    favorites, toggleFavorite,
    dancerNotes, setDancerNote,
    orgId, setOrgId, orgName, setOrgName, orgResolveAttempted,
    loginPromptOpen, setLoginPromptOpen,
    showTutorial, tutorialVariant, openTutorial, dismissTutorial, resetTutorial, tutorialNeverSeen,
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
