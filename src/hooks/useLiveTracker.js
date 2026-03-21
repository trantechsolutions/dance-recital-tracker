import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, getDocs, doc, setDoc, onSnapshot, orderBy
} from 'firebase/firestore';

export function useLiveTracker(orgId, selectedShowId) {
  const [recitalData, setRecitalData] = useState(null);
  const [currentAct, setCurrentAct] = useState({ number: null, title: '', isTracking: false });
  const [loading, setLoading] = useState(true);

  // 1. Real-time subscription for shows + acts for an org
  useEffect(() => {
    if (!orgId) {
      setRecitalData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Listen to shows for this org in real-time
    const showsQuery = query(collection(db, 'shows'), where('org_id', '==', orgId));

    const unsubShows = onSnapshot(showsQuery, async (showsSnap) => {
      try {
        if (showsSnap.empty) {
          setRecitalData({});
          setLoading(false);
          return;
        }

        const shows = showsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Fetch all acts for these shows
        const data = {};
        for (const show of shows) {
          const actsQuery = query(
            collection(db, 'acts'),
            where('show_id', '==', show.id),
            orderBy('number', 'asc')
          );
          const actsSnap = await getDocs(actsQuery);
          const acts = actsSnap.docs.map(d => ({
            number: d.data().number,
            title: d.data().title,
            performers: d.data().performers || []
          }));

          data[show.id] = {
            id: show.id,
            label: show.label,
            acts
          };
        }

        console.log(`Program Data Loaded for Org [${orgId}]:`, Object.keys(data));
        setRecitalData(data);
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

  return {
    recitalData,
    currentAct,
    loading,
    setRecitalData,
    updateActNumber,
    toggleTracking
  };
}
