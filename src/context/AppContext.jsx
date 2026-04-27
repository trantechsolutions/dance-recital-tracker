import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, authorizedUsers } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AppContext = createContext();

export function AppProvider({ children }) {
  // --- Global State ---
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isStudioAdmin, setIsStudioAdmin] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [hasSkippedLogin, setHasSkippedLogin] = useState(() => localStorage.getItem('hasSkippedLogin') === 'true');
  const [favorites, setFavorites] = useState(new Set());
  const [orgId, setOrgId] = useState(() => localStorage.getItem('selectedOrgId') || null);
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
          setIsAuthorized(false);
          setIsSuperAdmin(false);
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
    setIsAuthorized(isSuper);

    // Fetch user profile & favorites
    const profileRef = doc(db, 'user_profiles', u.uid);
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

  // --- Org Name + Studio Admin Check ---
  useEffect(() => {
    if (!orgId) return;
    const fetchOrg = async () => {
      try {
        const snap = await getDoc(doc(db, 'organizations', orgId));
        if (!snap.exists()) return;
        const data = snap.data();
        setOrgName(data.name || '');
        const studioAdmin = !!(user && data.admins?.includes(user.email));
        setIsStudioAdmin(studioAdmin);
        setIsAuthorized(prev => prev || studioAdmin);
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

    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);

      const newFavArray = Array.from(next);
      const profileRef = doc(db, 'user_profiles', user.uid);
      setDoc(profileRef, { favorites: newFavArray }, { merge: true })
        .catch(err => console.error("Failed to sync favorites:", err));

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
    orgId, setOrgId, orgName,
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
