import React, { useState, useMemo } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import ActCard from '../program/ActCard';

export default function SearchActView({ showData, favorites, currentAct }) {
  const [query, setQuery] = useState('');

  // 1. Move hooks to the TOP (above any early returns)
  const results = useMemo(() => {
    if (!query.trim() || !showData?.acts) return [];
    
    const q = query.toLowerCase();
    return showData.acts.filter(act => 
      act.title?.toLowerCase().includes(q) || 
      String(act.number).includes(q) ||
      act.performers?.some(p => p.toLowerCase().includes(q))
    );
  }, [query, showData]);

  // 2. Conditional guard comes AFTER all hooks
  if (!showData || !showData.acts) {
    return (
      <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-slate-400 font-medium">Select a show to search through the acts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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

      <div className="space-y-3">
        {results.map(act => (
          <ActCard 
            key={act.number} 
            act={act} 
            isFav={act.performers?.some(p => favorites?.has(p))} 
            isCurrent={currentAct.isTracking && act.number === currentAct.number} 
          />
        ))}
        {query && results.length === 0 && (
          <p className="text-center text-slate-400 py-10 italic">No acts found matching "{query}"</p>
        )}
        {!query && (
          <p className="text-center text-slate-400 py-10">Start typing to search the program.</p>
        )}
      </div>
    </div>
  );
}