import React from 'react';
import { doc, setDoc } from "firebase/firestore";
import { db } from '../../firebase';

export default function DataMigrator({ recitalData }) {
  const runMigration = async () => {
    if (!recitalData) return alert("No data to migrate yet!");
    
    try {
      const showIds = Object.keys(recitalData);
      for (const id of showIds) {
        console.log(`Migrating show: ${id}...`);
        await setDoc(doc(db, "program_data", id), recitalData[id]);
      }
      alert("✅ Migration Complete! All shows are now in Firestore.");
    } catch (e) {
      console.error("Migration Failed:", e);
      alert("❌ Migration failed. Check console and security rules.");
    }
  };

  return (
    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl mt-4">
      <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-2">Data Migration Tool</h4>
      <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-4">
        Click below to move all data from your current session (local .dat fallback) into the permanent Firestore database.
      </p>
      <button 
        onClick={runMigration}
        className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
      >
        Push Local Data to Firestore
      </button>
    </div>
  );
}