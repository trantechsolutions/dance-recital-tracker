import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, authorizedUsers } from '../supabase';

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
    let isMounted = true;

    // Safety timeout — if auth still hasn't resolved after 5s, unlock the UI
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        console.warn("[Auth] Safety timeout reached — unlocking UI");
        setIsAuthChecking(false);
      }
    }, 5000);

    // 1. Check current session on mount
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error("[Auth] getSession error:", error.message);
        if (session?.user) {
          await handleUserLogin(session.user);
        }
      } catch (err) {
        console.error("[Auth] initAuth failed:", err);
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimer);
          setIsAuthChecking(false);
        }
      }
    };

    initAuth();

    // 2. Listen for auth state changes (including INITIAL_SESSION in Supabase v2)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          await handleUserLogin(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthorized(false);
          setIsSuperAdmin(false);
          setFavorites(new Set());
        }
      } catch (err) {
        console.error("[Auth] onAuthStateChange error:", err);
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
      subscription.unsubscribe();
    };
  }, []);

  const handleUserLogin = async (u) => {
    setUser(u);
    const isSuper = u && authorizedUsers.includes(u.email);
    setIsSuperAdmin(isSuper);
    setIsAuthorized(isSuper);

    // Fetch user profile & favorites
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('favorites')
      .eq('id', u.id)
      .single();

    if (profile?.favorites) {
      setFavorites(new Set(profile.favorites));
    } else {
      setFavorites(new Set());
    }

    // Upsert user profile with login timestamp
    await supabase
      .from('user_profiles')
      .upsert({
        id: u.id,
        email: u.email,
        last_login: new Date().toISOString()
      }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.error("Error saving user profile", error);
      });
  };

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
      return false;
    }

    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);

      const newFavArray = Array.from(next);
      supabase
        .from('user_profiles')
        .update({ favorites: newFavArray })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error("Failed to sync favorites:", error);
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

export const useApp = () => {
  return useContext(AppContext);
};