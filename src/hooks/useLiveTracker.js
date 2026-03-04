import { useState, useEffect } from 'react';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection 
} from "firebase/firestore";
import { db } from '../firebase';

export function useLiveTracker(selectedShowId) {
  const [recitalData, setRecitalData] = useState(null);
  const [currentAct, setCurrentAct] = useState({ number: null, title: '', isTracking: false });
  const [loading, setLoading] = useState(true);

  // 1. Listen for ALL Program Data in Firestore
  useEffect(() => {
    const programRef = collection(db, "program_data");
    
    // This listener stays active and updates the UI if you change acts in Admin
    const unsubscribe = onSnapshot(programRef, (querySnapshot) => {
      const data = {};
      querySnapshot.forEach((doc) => {
        data[doc.id] = doc.data();
      });
      
      console.log("Program Data Loaded from Firestore:", Object.keys(data));
      setRecitalData(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Program Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Listen for "Now Performing" status
  useEffect(() => {
    // CRITICAL FIX: Don't run if no show is selected OR if recitalData isn't loaded yet
    if (!selectedShowId || !recitalData || !recitalData[selectedShowId]) {
      setCurrentAct({ number: null, title: '', isTracking: false });
      return;
    }

    const statusRef = doc(db, `artifacts/dancers-pointe-app/public/data/show_status`, selectedShowId);
    
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
  }, [selectedShowId, recitalData]); // Re-run when recitalData arrives

  // --- Persistence Actions ---
  const updateActNumber = async (num) => {
    if (!selectedShowId) return;
    const docRef = doc(db, `artifacts/dancers-pointe-app/public/data/show_status`, selectedShowId);
    await setDoc(docRef, { currentActNumber: num, isTracking: true }, { merge: true });
  };

  const toggleTracking = async () => {
    if (!selectedShowId) return;
    const docRef = doc(db, `artifacts/dancers-pointe-app/public/data/show_status`, selectedShowId);
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