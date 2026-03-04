import React, { useState, useMemo } from 'react';
import { Star, Search as SearchIcon } from 'lucide-react';
import { clsx } from 'clsx';

export default function SearchDancerView({ showData, favorites, toggleFavorite }) {
  const [query, setQuery] = useState('');

  // Top-level guard to handle the "no show selected" state
  if (!showData || !showData.acts) {
    return (
      <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-slate-400 font-medium">Select a show to search for dancers.</p>
      </div>
    );
  }

  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const q = query.toLowerCase();
    const map = {};
    
    // Safely iterate over acts
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

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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

      <div className="space-y-2">
        {results.map(res => (
          <div key={res.name} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div>
              <div className="font-bold dark:text-white">{res.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                Acts: {res.acts.map(a => `#${a.number}`).join(', ')}
              </div>
            </div>
            <button 
              onClick={() => toggleFavorite(res.name)} 
              className={clsx(
                "p-2 rounded-full transition-colors", 
                favorites?.has(res.name) ? "text-pink-600 bg-pink-50 dark:bg-pink-900/20" : "text-slate-300"
              )}
            >
              <Star size={20} className={favorites?.has(res.name) ? "fill-pink-600" : ""} />
            </button>
          </div>
        ))}
        {query && results.length === 0 && (
          <p className="text-center text-slate-400 py-10 italic">No dancers found matching "{query}"</p>
        )}
        {!query && (
          <p className="text-center text-slate-400 py-10">Start typing to search for a performer.</p>
        )}
      </div>
    </div>
  );
}