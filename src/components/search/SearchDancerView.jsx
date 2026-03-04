import React, { useState, useMemo } from 'react';
import { Star, Search as SearchIcon, Cloud } from 'lucide-react';
import { clsx } from 'clsx';

export default function SearchDancerView({ showData, favorites, toggleFavorite, user }) {
  const [query, setQuery] = useState('');

  // 1. Hook for Search Results
  const results = useMemo(() => {
    if (!showData || !showData.acts || !query.trim()) return [];
    
    const q = query.toLowerCase();
    const map = {};
    
    showData.acts.forEach(act => {
      act.performers?.forEach(name => {
        if (name.toLowerCase().includes(q)) {
          if (!map[name]) map[name] = [];
          map[name].push({ number: act.number, title: act.title });
        }
      });
    });
    
    return Object.entries(map)
      .map(([name, acts]) => ({ name, acts }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query, showData]);

  // 2. Hook to gather currently favorited dancers in this show
  const favoriteDancers = useMemo(() => {
    if (!showData || !showData.acts || !favorites) return [];
    
    const map = {};
    showData.acts.forEach(act => {
      act.performers?.forEach(name => {
        if (favorites.has(name)) {
          if (!map[name]) map[name] = [];
          map[name].push({ number: act.number, title: act.title });
        }
      });
    });
    
    return Object.entries(map)
      .map(([name, acts]) => ({ name, acts }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [showData, favorites]);

  // 3. Early return goes AFTER all hooks
  if (!showData || !showData.acts) {
    return (
      <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-slate-400 font-medium">Select a show to search for dancers.</p>
      </div>
    );
  }

  // Extracted card component for cleaner rendering
  const DancerCard = ({ res }) => (
    <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm h-full">
      <div>
        <div className="font-bold dark:text-white">{res.name}</div>
        <div className="text-xs text-slate-500 mt-1">
          Acts: {res.acts.map(a => `#${a.number}`).join(', ')}
        </div>
      </div>
      <button 
        onClick={() => toggleFavorite(res.name)} 
        className={clsx(
          "p-2 rounded-full transition-colors shrink-0", 
          favorites?.has(res.name) ? "text-pink-600 bg-pink-50 dark:bg-pink-900/20" : "text-slate-300 hover:text-pink-400 hover:bg-slate-50 dark:hover:bg-slate-700"
        )}
      >
        <Star size={20} className={favorites?.has(res.name) ? "fill-pink-600" : ""} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search for a dancer..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-800 dark:text-white border-none shadow-sm focus:ring-2 focus:ring-pink-500 outline-none transition-all"
          value={query} 
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div>
        {query ? (
          // --- SHOW SEARCH RESULTS ---
          <>
            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map(res => <DancerCard key={res.name} res={res} />)}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-10 italic">No dancers found matching "{query}"</p>
            )}
          </>
        ) : (
          // --- SHOW FAVORITES (WHEN SEARCH IS EMPTY) ---
          <>
            {favoriteDancers.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 mb-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Your Favorited Dancers
                  </h3>
                  {user && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md" title="Synced to cloud">
                      <Cloud size={12} /> Synced
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favoriteDancers.map(res => <DancerCard key={res.name} res={res} />)}
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-10">Start typing to search for a performer.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}