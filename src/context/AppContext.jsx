import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { auth, db, authorizedUsers, coll } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { MULTI_STUDIO_ENABLED, DEFAULT_ORG_ID } from '../config';
import { subscribeNameAccess } from '../services/nameAccessService';

const AppContext = createContext();

// --- Guest (logged-out) local persistence ---
// Favorites and per-act dancer notes are saved to localStorage while browsing
// without an account, then merged into the user's profile on login.
const GUEST_FAVORITES_KEY = 'guestFavorites';
const GUEST_NOTES_KEY = 'guestDancerNotes';
// Set when the user opts out of the on-login sync prompt ("Don't ask again").
// The manual Sync button in My Schedule ignores this and re-opens the prompt.
const SYNC_DISMISSED_KEY = 'syncPromptDismissed';

const hasGuestData = () =>
  loadGuestFavorites().size > 0 || Object.keys(loadGuestNotes()).length > 0;

const loadGuestFavorites = () => {
  try {
    const raw = localStorage.getItem(GUEST_FAVORITES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};
const saveGuestFavorites = (set) => {
  try {
    localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(Array.from(set)));
  } catch { /* storage unavailable (private mode / quota) — non-fatal */ }
};
const loadGuestNotes = () => {
  try {
    const raw = localStorage.getItem(GUEST_NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const saveGuestNotes = (obj) => {
  try {
    localStorage.setItem(GUEST_NOTES_KEY, JSON.stringify(obj));
  } catch { /* storage unavailable — non-fatal */ }
};
const clearGuestData = () => {
  try {
    localStorage.removeItem(GUEST_FAVORITES_KEY);
    localStorage.removeItem(GUEST_NOTES_KEY);
  } catch { /* storage unavailable — non-fatal */ }
};

export function AppProvider({ children }) {
  // --- Global State ---
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isStudioAdmin, setIsStudioAdmin] = useState(false);

  // Derived — no independent state; eliminates the dual-writer race
  const isAuthorized = useMemo(() => isSuperAdmin || isStudioAdmin, [isSuperAdmin, isStudioAdmin]);

  // Super-admin-managed allowlist of emails permitted to see full (non-redacted)
  // performer names. Watched live so grants/revokes take effect without reload.
  const [nameAccessEmails, setNameAccessEmails] = useState([]);

  // A viewer sees full names if they're an admin (super or studio) or their
  // email is on the allowlist. Everyone else — including logged-out guests —
  // sees the last-initial form.
  const canViewFullNames = useMemo(
    () => !!user && (isSuperAdmin || isStudioAdmin || nameAccessEmails.includes((user.email || '').toLowerCase())),
    [user, isSuperAdmin, isStudioAdmin, nameAccessEmails]
  );
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [hasSkippedLogin, setHasSkippedLogin] = useState(() => localStorage.getItem('hasSkippedLogin') === 'true');
  // Seed from any guest data saved while logged out; replaced on login with the
  // merged profile, restored to guest data on logout.
  const [favorites, setFavorites] = useState(() => loadGuestFavorites());
  // Private per-dancer-per-act notes (outfit/hairstyle, etc.), keyed by
  // `${showId}::${actNumber}::${dancer}`. Stored on the user's own profile when
  // logged in, or in localStorage as a guest.
  const [dancerNotes, setDancerNotes] = useState(() => loadGuestNotes());
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
  // Login-time prompt offering to merge device-local (guest) favorites/notes
  // into the account. pendingGuestData holds the captured guest data; the ref
  // ensures we only ask once per logged-in session.
  const [syncPromptOpen, setSyncPromptOpen] = useState(false);
  const [pendingGuestData, setPendingGuestData] = useState(null);
  // Manual opens (from the My Schedule button) hide the "Don't ask again" option,
  // which only governs the automatic on-login prompt.
  const [syncPromptManual, setSyncPromptManual] = useState(false);
  const syncResolvedRef = useRef(false);
  // Whether device-local guest data exists right now — drives the My Schedule
  // "Sync" button visibility. Recomputed whenever guest storage changes.
  const [guestDataPresent, setGuestDataPresent] = useState(() => hasGuestData());
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
          // Fall back to whatever was saved while browsing as a guest.
          setFavorites(loadGuestFavorites());
          setDancerNotes(loadGuestNotes());
          // Allow the sync prompt to fire again on the next login.
          syncResolvedRef.current = false;
          setSyncPromptOpen(false);
          setPendingGuestData(null);
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

  // Watch the full-name allowlist in real time, but only while signed in —
  // guests can never see full names anyway, and skipping the read keeps the doc
  // locked down to authenticated users in Firestore rules. Errors (e.g.
  // permission) fall back to an empty list, keeping everyone on the redacted view.
  useEffect(() => {
    if (!user) { setNameAccessEmails([]); return; }
    const unsubscribe = subscribeNameAccess(
      (emails) => setNameAccessEmails(emails),
      (err) => console.warn('[NameAccess] subscription error:', err?.message || err)
    );
    return () => unsubscribe();
  }, [user]);

  const handleUserLogin = async (u) => {
    setUser(u);
    const isSuper = u && authorizedUsers.includes(u.email);
    setIsSuperAdmin(isSuper);

    // Fetch user profile & favorites — the account is the source of truth on
    // login; device-local guest data is only merged in if the user opts to.
    const profileRef = doc(db, coll('user_profiles'), u.uid);
    const profileSnap = await getDoc(profileRef);
    const data = profileSnap.exists() ? profileSnap.data() : {};
    setFavorites(new Set(data.favorites || []));
    setDancerNotes(data.dancerNotes || {});

    // Upsert user profile with login timestamp
    await setDoc(profileRef, {
      email: u.email,
      last_login: new Date().toISOString()
    }, { merge: true });

    // Offer to merge anything saved while browsing as a guest. Resolved once per
    // session (Sync or Keep separate) so a re-fired auth event won't re-ask, and
    // suppressed entirely once the user has chosen "Don't ask again".
    const guestFavorites = loadGuestFavorites();
    const guestNotes = loadGuestNotes();
    const guestExists = guestFavorites.size > 0 || Object.keys(guestNotes).length > 0;
    setGuestDataPresent(guestExists);
    const optedOut = localStorage.getItem(SYNC_DISMISSED_KEY) === 'true';
    if (!syncResolvedRef.current && !optedOut && guestExists) {
      setPendingGuestData({ favorites: guestFavorites, notes: guestNotes });
      setSyncPromptManual(false);
      setSyncPromptOpen(true);
    }
  };

  // Manually open the sync prompt from the My Schedule button. Bypasses both the
  // once-per-session guard and the "Don't ask again" opt-out.
  const openSyncPrompt = () => {
    const guestFavorites = loadGuestFavorites();
    const guestNotes = loadGuestNotes();
    if (guestFavorites.size === 0 && Object.keys(guestNotes).length === 0) return;
    setPendingGuestData({ favorites: guestFavorites, notes: guestNotes });
    setSyncPromptManual(true);
    setSyncPromptOpen(true);
  };

  // Merge the pending device-local data into the logged-in account: favorites
  // are unioned, notes take the device value on a key conflict (it's the most
  // recently typed). Optimistic with rollback, then clears local guest storage.
  const confirmSync = async () => {
    syncResolvedRef.current = true;
    setSyncPromptOpen(false);
    const pending = pendingGuestData;
    setPendingGuestData(null);
    if (!user || !pending) return;

    const prevFavorites = favorites;
    const prevNotes = dancerNotes;
    const mergedFavorites = new Set([...prevFavorites, ...pending.favorites]);
    const mergedNotes = { ...prevNotes, ...pending.notes };
    setFavorites(mergedFavorites);
    setDancerNotes(mergedNotes);

    try {
      const profileRef = doc(db, coll('user_profiles'), user.uid);
      await setDoc(profileRef, {
        favorites: Array.from(mergedFavorites),
        dancerNotes: mergedNotes,
      }, { merge: true });
      clearGuestData();
      setGuestDataPresent(false);
    } catch {
      // Write failed — roll back state and keep guest data so it can be retried.
      setFavorites(prevFavorites);
      setDancerNotes(prevNotes);
    }
  };

  // Decline the merge. Account data stays as-is; guest data is left in
  // localStorage so it reappears when browsing logged out again. When
  // dontAskAgain is set, the automatic on-login prompt is suppressed for good
  // (the manual My Schedule button still works).
  const dismissSync = (dontAskAgain = false) => {
    syncResolvedRef.current = true;
    setSyncPromptOpen(false);
    setPendingGuestData(null);
    if (dontAskAgain) {
      try {
        localStorage.setItem(SYNC_DISMISSED_KEY, 'true');
      } catch { /* storage unavailable — non-fatal */ }
    }
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
    // Logged out: persist to localStorage so favorites survive a reload and can
    // be merged into the account on login.
    if (!user) {
      setFavorites(prev => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        saveGuestFavorites(next);
        setGuestDataPresent(hasGuestData());
        return next;
      });
      return true;
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
    const trimmed = (text || '').trim().slice(0, 500);

    // Logged out: persist to localStorage, merged into the account on login.
    if (!user) {
      setDancerNotes(prev => {
        const next = { ...prev };
        if (trimmed) next[key] = trimmed;
        else delete next[key];
        saveGuestNotes(next);
        setGuestDataPresent(hasGuestData());
        return next;
      });
      return true;
    }

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
    canViewFullNames, nameAccessEmails,
    hasSkippedLogin, skipLogin, clearSkipLogin,
    favorites, toggleFavorite,
    dancerNotes, setDancerNote,
    orgId, setOrgId, orgName, setOrgName, orgResolveAttempted,
    loginPromptOpen, setLoginPromptOpen,
    syncPromptOpen, syncPromptManual, confirmSync, dismissSync,
    openSyncPrompt, guestDataPresent,
    syncPromptCounts: {
      favorites: pendingGuestData ? pendingGuestData.favorites.size : 0,
      notes: pendingGuestData ? Object.keys(pendingGuestData.notes).length : 0,
    },
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
