import React from 'react';
import { supabase } from '../../supabase';

export default function DataMigrator({ recitalData, orgId }) {
  const runMigration = async () => {
    if (!recitalData) return alert("No data to migrate yet!");
    if (!orgId) return alert("No organization selected!");
    
    try {
      const showIds = Object.keys(recitalData);
      for (const id of showIds) {
        const show = recitalData[id];
        console.log(`Migrating show: ${id}...`);
        
        // Upsert the show
        await supabase
          .from('shows')
          .upsert({ id, org_id: orgId, label: show.label }, { onConflict: 'id' });

        // Replace acts
        await supabase.from('acts').delete().eq('show_id', id);
        
        if (show.acts && show.acts.length > 0) {
          const actsToInsert = show.acts.map(act => ({
            show_id: id,
            number: act.number,
            title: act.title,
            performers: act.performers || []
          }));
          await supabase.from('acts').insert(actsToInsert);
        }
      }
      alert("Migration Complete! All shows are now in Supabase.");
    } catch (e) {
      console.error("Migration Failed:", e);
      alert("Migration failed. Check console for details.");
    }
  };

  return (
    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl mt-4">
      <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-2">Data Migration Tool</h4>
      <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-4">
        Click below to move all data from your current session into the Supabase database.
      </p>
      <button 
        onClick={runMigration}
        className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
      >
        Push Local Data to Supabase
      </button>
    </div>
  );
}