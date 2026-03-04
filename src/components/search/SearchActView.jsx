import React, { useState, useMemo } from 'react';
import { Search as SearchIcon, Cloud } from 'lucide-react';
import ActCard from '../program/ActCard';

export default function SearchActView({ showData, favorites, currentAct, toggleFavorite, user }) {
  const [query, setQuery] = useState('');

  // 1. Hook for Search Results
  const results = useMemo(() => {
    if (!query.trim() || !showData?.acts) return [];
    
    const q = query.toLowerCase();
    return showData.acts.filter(act => 
      act.title?.toLowerCase().includes(q) || 
      String(act.number).includes(q) ||
      act.performers?.some(p => p.toLowerCase().includes(q))
    );
  }, [query, showData]);

  // 2. Hook for Favorited Acts (Direct act favorites OR containing a favorited dancer)
  const favoriteActs = useMemo(() => {
    if (!showData?.acts || !favorites) return [];
    
    return showData.acts.filter(act => 
      favorites.has(`act-${act.number}`) || 
      act.performers?.some(p => favorites.has(p))
    );
  }, [showData, favorites]);

  // 3. Early return goes AFTER all hooks
  if (!showData || !showData.acts) {
    return (
      <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-slate-400 font-medium">Select a show to search through the acts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search act, #, or dancer..."
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
                {results.map(act => (
                  <ActCard 
                    key={act.number} 
                    act={act} 
                    isCurrent={currentAct.isTracking && act.number === currentAct.number} 
                    toggleFavorite={toggleFavorite}
                    favorites={favorites}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-10 italic">No acts found matching "{query}"</p>
            )}
          </>
        ) : (
          // --- SHOW FAVORITES (WHEN SEARCH IS EMPTY) ---
          <>
            {favoriteActs.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 mb-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Your Favorited Acts
                  </h3>
                  {user && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md" title="Synced to cloud">
                      <Cloud size={12} /> Synced
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favoriteActs.map(act => (
                    <ActCard 
                      key={act.number} 
                      act={act} 
                      isCurrent={currentAct.isTracking && act.number === currentAct.number} 
                      toggleFavorite={toggleFavorite}
                      favorites={favorites}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-10">Start typing to search the program.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}