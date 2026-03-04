import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, authorizedUsers, DB_PREFIX } from '../firebase'; 

const AppContext = createContext();

export function AppProvider({ children }) {
  // --- Global State ---
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [hasSkippedLogin, setHasSkippedLogin] = useState(() => localStorage.getItem('hasSkippedLogin') === 'true');
  const [favorites, setFavorites] = useState(new Set());
  const [orgId, setOrgId] = useState(() => localStorage.getItem('selectedOrgId') || null);

  // --- Auth & Favorites Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      const isSuper = u && authorizedUsers.includes(u.email);
      setIsSuperAdmin(isSuper);
      setIsAuthorized(isSuper);

      if (u) {
        // Fetch strict cloud favorites
        const userRef = doc(db, `${DB_PREFIX}users`, u.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists() && userSnap.data().favorites) {
          setFavorites(new Set(userSnap.data().favorites));
        } else {
          setFavorites(new Set()); 
        }

        // Save login timestamp for the Admin User Table
        setDoc(userRef, { 
          email: u.email,
          lastLogin: new Date().toISOString()
        }, { merge: true }).catch(err => console.error("Error saving user profile", err));

      } else {
        setFavorites(new Set());
      }
      
      setIsAuthChecking(false);
    });
    return unsubscribe;
  }, []);

  // --- Org ID Sync ---
  useEffect(() => {
    if (orgId) {
      localStorage.setItem('selectedOrgId', orgId);
    } else {
      localStorage.removeItem('selectedOrgId');
    }
  }, [orgId]);

  // --- Actions ---
  const toggleFavorite = async (name) => {
    if (!user) {
      alert("Please create an account or sign in from the Setup tab to save favorites!");
      return false; // Return false so the UI knows they aren't logged in
    }

    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      
      const newFavArray = Array.from(next);
      const userRef = doc(db, `${DB_PREFIX}users`, user.uid);
      setDoc(userRef, { favorites: newFavArray }, { merge: true })
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
    user, isAuthorized, isSuperAdmin, isAuthChecking, 
    hasSkippedLogin, skipLogin, clearSkipLogin,
    favorites, toggleFavorite,
    orgId, setOrgId
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to easily grab this data from any component
export const useApp = () => {
  return useContext(AppContext);
};