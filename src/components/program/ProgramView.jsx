import React from 'react';
import ActCard from './ActCard';

export default function ProgramView({ showData, favorites, currentAct }) {
  // Guard clause to prevent "undefined" errors when no show is selected
  if (!showData || !showData.acts) {
    return (
      <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-slate-400 font-medium">Select a show to view the performance program.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-end mb-4 px-1">
        <h2 className="text-xl font-black dark:text-white">Program</h2>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {showData.acts.length} Acts Total
        </span>
      </div>
      
      {showData.acts.map(act => (
        <ActCard 
          key={act.number} 
          act={act} 
          isFav={act.performers?.some(p => favorites?.has(p))}
          isCurrent={currentAct.isTracking && act.number === currentAct.number}
        />
      ))}
    </div>
  );
}