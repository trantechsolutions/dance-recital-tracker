import { useState, useEffect, useRef } from 'react';
import { db, coll } from '../firebase';
import {
  collection, query, where, getDocs, doc, setDoc, onSnapshot, arrayUnion
} from 'firebase/firestore';

export function useLiveTracker(orgId, selectedShowId, enabled = true) {
  const [recitalData, setRecitalData] = useState(null);
  const [currentAct, setCurrentAct] = useState({ number: null, title: '', isTracking: false });
  const [loading, setLoading] = useState(true);
  const [liveShowId, setLiveShowId] = useState(null);
  // Every act change for the selected show: [{ number, at }]. Feeds the
  // booth's start/ran columns and, later, real minute estimates for parents.
  const [actLog, setActLog] = useState([]);

  // Cache of already-fetched acts keyed by showId, so snapshot re-fires don't
  // re-fetch acts for shows whose IDs haven't changed.
  const actsCache = useRef({});

  // 1. Real-time subscription for shows + acts for an org
  useEffect(() => {
    if (!orgId) {
      setRecitalData(null);
      setLoading(false);
      actsCache.current = {};
      return;
    }

    // Firestore rules now gate shows/acts reads behind `request.auth != null`.
    // Subscribing before sign-in completes gets a permission-denied that
    // onSnapshot never recovers from (the [orgId] dep doesn't re-run on login),
    // stranding the UI on an infinite spinner. `enabled` (auth-ready) holds the
    // subscription until the user is authenticated; clearing it on logout drops
    // the previous studio's data so it can't leak into a re-login.
    if (!enabled) {
      setRecitalData(null);
      actsCache.current = {};
      setLoading(true);
      return;
    }

    setLoading(true);
    actsCache.current = {};

    const showsQuery = query(collection(db, coll('shows')), where('org_id', '==', orgId));

    const unsubShows = onSnapshot(showsQuery, async (showsSnap) => {
      try {
        if (showsSnap.empty) {
          setRecitalData({});
          setLoading(false);
          return;
        }

        const shows = showsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Refetch acts when a show is new to the cache OR its updated_at has
        // changed (i.e. an admin edited/removed acts). Without the version
        // check, viewers keep serving stale acts — including dancers that were
        // already removed — for the lifetime of the session.
        const uncached = shows.filter(s => {
          const cached = actsCache.current[s.id];
          return !cached || cached.updatedAt !== (s.updated_at ?? null);
        });
        if (uncached.length > 0) {
          // No orderBy here: where + orderBy needs a composite index per
          // collection (acts AND test_acts). Acts per show are few — sort
          // client-side instead so dev/test collections never need indexes.
          const fetched = await Promise.all(
            uncached.map(show =>
              getDocs(query(
                collection(db, coll('acts')),
                where('show_id', '==', show.id)
              ))
            )
          );
          uncached.forEach((show, i) => {
            actsCache.current[show.id] = {
              updatedAt: show.updated_at ?? null,
              acts: fetched[i].docs.map(d => ({
                // Use the persisted `id` field, never the Firestore doc id
                // (d.id) — doc ids churn on every save, this field is stable.
                id: d.data().id,
                number: d.data().number,
                title: d.data().title,
                performers: d.data().performers || []
              })).sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
            };
          });
        }

        // Remove evicted shows from cache
        const liveIds = new Set(shows.map(s => s.id));
        Object.keys(actsCache.current).forEach(id => {
          if (!liveIds.has(id)) delete actsCache.current[id];
        });

        const data = {};
        shows.forEach(show => {
          data[show.id] = {
            id: show.id,
            label: show.label,
            acts: actsCache.current[show.id]?.acts || []
          };
        });

        setRecitalData(data);

      } catch (err) {
        console.error("Firestore Program Error:", err);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      // Listener rejected (e.g. permission-denied before any snapshot). Without
      // this handler the success callback never fires and `loading` stays true
      // forever — the infinite-spinner bug. Resolve loading so the UI can render.
      console.error("Firestore Program subscription error:", err);
      setLoading(false);
    });

    // Which show is live right now. A listener (not a one-off read) so a show
    // starting or stopping reaches every open phone without a reload.
    const liveQuery = query(
      collection(db, coll('show_status')),
      where('org_id', '==', orgId),
      where('is_tracking', '==', true)
    );
    const unsubLive = onSnapshot(liveQuery, (snap) => {
      const first = snap.docs?.[0];
      setLiveShowId(first ? (first.data().show_id || first.id) : null);
    }, (err) => {
      console.warn('Firestore live-show subscription error:', err?.message || err);
    });

    return () => { unsubShows(); unsubLive?.(); };
  }, [orgId, enabled]);

  // 2. Listen for "Now Performing" status for the specific show
  useEffect(() => {
    if (!orgId || !selectedShowId || !recitalData || !recitalData[selectedShowId]) {
      setCurrentAct({ number: null, title: '', isTracking: false });
      setActLog([]);
      return;
    }

    const statusRef = doc(db, coll('show_status'), selectedShowId);

    const unsubStatus = onSnapshot(statusRef, (snap) => {
      if (!snap.exists()) {
        setCurrentAct({ number: 1, title: 'Not Started', isTracking: false });
        setActLog([]);
        return;
      }

      const statusData = snap.data();
      const acts = recitalData[selectedShowId]?.acts || [];
      const act = acts.find(a => a.number === statusData.current_act_number);

      setCurrentAct({
        number: statusData.current_act_number,
        title: act ? act.title : 'Act not found',
        isTracking: statusData.is_tracking || false,
        startedAt: statusData.act_started_at || null,
        phase: statusData.phase || null,
      });
      setActLog(Array.isArray(statusData.act_log) ? statusData.act_log : []);
    }, (err) => {
      // Non-critical: a rejected status listener just leaves currentAct stale.
      console.warn("Firestore Status subscription error:", err?.message || err);
    });

    return () => unsubStatus();
  }, [orgId, selectedShowId, recitalData]);

  // --- Persistence Actions ---
  const updateActNumber = async (num) => {
    if (!orgId || !selectedShowId) return;

    const now = new Date().toISOString();
    await setDoc(doc(db, coll('show_status'), selectedShowId), {
      show_id: selectedShowId,
      org_id: orgId,
      current_act_number: num,
      is_tracking: true,
      act_started_at: now,
      act_log: arrayUnion({ number: num, at: now }),
      phase: null,
      updated_at: now
    }, { merge: true });
  };

  // Intermission keeps the show live for parents (their place in the running
  // order and countdowns stay put); ending stops it and says so.
  const setShowPhase = async (phase) => {
    if (!orgId || !selectedShowId) return;
    const now = new Date().toISOString();
    await setDoc(doc(db, coll('show_status'), selectedShowId), {
      show_id: selectedShowId,
      org_id: orgId,
      phase,
      is_tracking: phase !== 'ended',
      ...(phase === 'intermission' ? { intermission_at: now } : {}),
      ...(phase === 'ended' ? { ended_at: now } : {}),
      updated_at: now
    }, { merge: true });
  };

  const toggleTracking = async () => {
    if (!orgId || !selectedShowId) return;

    await setDoc(doc(db, coll('show_status'), selectedShowId), {
      show_id: selectedShowId,
      org_id: orgId,
      is_tracking: !currentAct.isTracking,
      updated_at: new Date().toISOString()
    }, { merge: true });
  };

  const invalidateActsCache = (showId) => {
    delete actsCache.current[showId];
  };

  return {
    recitalData,
    currentAct,
    actLog,
    loading,
    liveShowId,
    setRecitalData,
    invalidateActsCache,
    updateActNumber,
    setShowPhase,
    toggleTracking
  };
}
