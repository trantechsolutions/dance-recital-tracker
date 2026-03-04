import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, collection } from "firebase/firestore";
import { db } from '../firebase';

export function useLiveTracker(orgId, selectedShowId) {
  const [recitalData, setRecitalData] = useState(null);
  const [currentAct, setCurrentAct] = useState({ number: null, title: '', isTracking: false });
  const [loading, setLoading] = useState(true);

  // 1. Listen for ALL Program Data in the specific Organization
  useEffect(() => {
    // Safety check: Don't fetch if no org is selected
    if (!orgId) {
      setRecitalData(null);
      setLoading(false);
      return;
    }

    const programRef = collection(db, `organizations/${orgId}/shows`);
    
    const unsubscribe = onSnapshot(programRef, (querySnapshot) => {
      const data = {};
      querySnapshot.forEach((doc) => {
        data[doc.id] = doc.data();
      });
      
      console.log(`Program Data Loaded for Org [${orgId}]:`, Object.keys(data));
      setRecitalData(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Program Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId]);

  // 2. Listen for "Now Performing" status for the specific show
  useEffect(() => {
    if (!orgId || !selectedShowId || !recitalData || !recitalData[selectedShowId]) {
      setCurrentAct({ number: null, title: '', isTracking: false });
      return;
    }

    const statusRef = doc(db, `organizations/${orgId}/status`, selectedShowId);
    
    const unsubscribe = onSnapshot(statusRef, (docSnap) => {
      if (!docSnap.exists()) {
        setCurrentAct({ number: 1, title: 'Not Started', isTracking: false });
        return;
      }

      const statusData = docSnap.data();
      const acts = recitalData[selectedShowId]?.acts || [];
      const act = acts.find(a => a.number === statusData.currentActNumber);
      
      setCurrentAct({
        number: statusData.currentActNumber,
        title: act ? act.title : 'Act not found',
        isTracking: statusData.isTracking || false
      });
    });

    return () => unsubscribe();
  }, [orgId, selectedShowId, recitalData]);

  // --- Persistence Actions ---
  const updateActNumber = async (num) => {
    if (!orgId || !selectedShowId) return;
    const docRef = doc(db, `organizations/${orgId}/status`, selectedShowId);
    await setDoc(docRef, { currentActNumber: num, isTracking: true }, { merge: true });
  };

  const toggleTracking = async () => {
    if (!orgId || !selectedShowId) return;
    const docRef = doc(db, `organizations/${orgId}/status`, selectedShowId);
    await setDoc(docRef, { isTracking: !currentAct.isTracking }, { merge: true });
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