import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, getDocs, doc, setDoc, onSnapshot, orderBy
} from 'firebase/firestore';

export function useLiveTracker(orgId, selectedShowId) {
  const [recitalData, setRecitalData] = useState(null);
  const [currentAct, setCurrentAct] = useState({ number: null, title: '', isTracking: false });
  const [loading, setLoading] = useState(true);
  const [liveShowId, setLiveShowId] = useState(null);

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

    setLoading(true);
    actsCache.current = {};

    const showsQuery = query(collection(db, 'shows'), where('org_id', '==', orgId));

    const unsubShows = onSnapshot(showsQuery, async (showsSnap) => {
      try {
        if (showsSnap.empty) {
          setRecitalData({});
          setLoading(false);
          return;
        }

        const shows = showsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Only fetch acts for shows not already in the cache
        const uncached = shows.filter(s => !actsCache.current[s.id]);
        if (uncached.length > 0) {
          const fetched = await Promise.all(
            uncached.map(show =>
              getDocs(query(
                collection(db, 'acts'),
                where('show_id', '==', show.id),
                orderBy('number', 'asc')
              ))
            )
          );
          uncached.forEach((show, i) => {
            actsCache.current[show.id] = fetched[i].docs.map(d => ({
              number: d.data().number,
              title: d.data().title,
              performers: d.data().performers || []
            }));
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
            acts: actsCache.current[show.id] || []
          };
        });

        setRecitalData(data);

        // Parallel check for any live show
        try {
          const statusResults = await Promise.all(
            shows.map(show =>
              getDocs(query(
                collection(db, 'show_status'),
                where('show_id', '==', show.id),
                where('is_tracking', '==', true)
              ))
            )
          );
          const liveIndex = statusResults.findIndex(snap => !snap.empty);
          setLiveShowId(liveIndex !== -1 ? shows[liveIndex].id : null);
        } catch { /* non-critical */ }
      } catch (err) {
        console.error("Firestore Program Error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubShows();
  }, [orgId]);

  // 2. Listen for "Now Performing" status for the specific show
  useEffect(() => {
    if (!orgId || !selectedShowId || !recitalData || !recitalData[selectedShowId]) {
      setCurrentAct({ number: null, title: '', isTracking: false });
      return;
    }

    const statusRef = doc(db, 'show_status', selectedShowId);

    const unsubStatus = onSnapshot(statusRef, (snap) => {
      if (!snap.exists()) {
        setCurrentAct({ number: 1, title: 'Not Started', isTracking: false });
        return;
      }

      const statusData = snap.data();
      const acts = recitalData[selectedShowId]?.acts || [];
      const act = acts.find(a => a.number === statusData.current_act_number);

      setCurrentAct({
        number: statusData.current_act_number,
        title: act ? act.title : 'Act not found',
        isTracking: statusData.is_tracking || false
      });
    });

    return () => unsubStatus();
  }, [orgId, selectedShowId, recitalData]);

  // --- Persistence Actions ---
  const updateActNumber = async (num) => {
    if (!orgId || !selectedShowId) return;

    await setDoc(doc(db, 'show_status', selectedShowId), {
      show_id: selectedShowId,
      org_id: orgId,
      current_act_number: num,
      is_tracking: true,
      updated_at: new Date().toISOString()
    }, { merge: true });
  };

  const toggleTracking = async () => {
    if (!orgId || !selectedShowId) return;

    await setDoc(doc(db, 'show_status', selectedShowId), {
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
    loading,
    liveShowId,
    setRecitalData,
    invalidateActsCache,
    updateActNumber,
    toggleTracking
  };
}
