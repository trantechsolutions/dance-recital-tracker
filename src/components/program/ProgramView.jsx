import React, { useState } from 'react';
import ActCard from './ActCard';
import { Filter } from 'lucide-react';
import { clsx } from 'clsx';

export default function ProgramView({ showData, favorites, currentAct, toggleFavorite }) {
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  if (!showData || !showData.acts) {
    return (
      <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-slate-400 font-medium">Select a show to view the performance program.</p>
      </div>
    );
  }

  // Filter acts if the toggle is active based on act favorites OR dancer favorites
  const displayedActs = showOnlyFavorites 
    ? showData.acts.filter(act => 
        favorites?.has(`act-${act.number}`) || 
        act.performers?.some(p => favorites?.has(p))
      )
    : showData.acts;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      <div className="flex justify-between items-end mb-4 px-1">
        <h2 className="text-xl font-black dark:text-white">Program</h2>
        
        <div className="flex items-center gap-3">
          {/* Favorites Filter Toggle (Only shows if they have favorites saved) */}
          {favorites?.size > 0 && (
            <button 
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all",
                showOnlyFavorites 
                  ? "bg-pink-100 dark:bg-pink-900/30 text-pink-600 shadow-inner border border-pink-200 dark:border-pink-800/50" 
                  : "bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <Filter size={14} className={showOnlyFavorites ? "fill-pink-600" : ""} />
              {showOnlyFavorites ? "Filtering Favs" : "Filter Favs"}
            </button>
          )}
          
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline-block">
            {displayedActs.length} Acts
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedActs.length > 0 ? (
          displayedActs.map(act => (
            <ActCard 
              key={act.number} 
              act={act} 
              isCurrent={currentAct.isTracking && act.number === currentAct.number}
              toggleFavorite={toggleFavorite}
              favorites={favorites}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-slate-400 font-medium">None of your favorites are in this performance.</p>
          </div>
        )}
      </div>
    </div>
  );
}