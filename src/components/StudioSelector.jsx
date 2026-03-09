import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Building2, ChevronRight, Loader2 } from 'lucide-react';

export default function StudioSelector({ onSelect }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name');

        if (error) throw error;
        setOrgs(data || []);
      } catch (err) {
        console.error("Error fetching organizations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Building2 size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Welcome</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Select your studio or organization to view their performance program.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-pink-500">
            <Loader2 className="animate-spin mb-4" size={32} />
            <span className="text-xs font-black uppercase tracking-widest">Finding Studios...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {orgs.length > 0 ? (
              orgs.map(org => (
                <button
                  key={org.id}
                  onClick={() => onSelect(org.id)}
                  className="w-full bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-pink-300 dark:hover:border-pink-700 transition-all group flex items-center justify-between"
                >
                  <span className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    {org.name || org.id}
                  </span>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))
            ) : (
              <div className="text-center p-8 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-400 font-medium">No organizations found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}