import React from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';

export default function ActCard({ act, isCurrent, toggleFavorite, favorites }) {
  // Check if the act itself is explicitly favorited
  const isActFav = favorites?.has(`act-${act.number}`);
  // Check if any performer in the act is favorited
  const hasFavDancer = act.performers?.some(p => favorites?.has(p));
  
  // Highlight the card if either condition is true
  const isHighlighted = isActFav || hasFavDancer;

  return (
    <div className={clsx(
      "p-4 rounded-xl border transition-all duration-300 h-full flex flex-col",
      isCurrent 
        ? "bg-pink-50 dark:bg-pink-900/20 border-pink-500 ring-1 ring-pink-500 scale-[1.02]" 
        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
      isHighlighted && !isCurrent && "border-l-4 border-l-pink-600"
    )}>
      <div className="flex justify-between items-start gap-4">
        <div className="font-bold text-lg dark:text-white leading-tight">
          <span className="text-pink-600 mr-2">#{act.number}</span>
          {act.title}
        </div>
        
        {/* Clickable Star for the Act */}
        {toggleFavorite && (
          <button 
            onClick={() => toggleFavorite(`act-${act.number}`)}
            className={clsx(
              "p-2 -mr-2 -mt-2 rounded-full transition-colors shrink-0",
              isActFav 
                ? "text-pink-600 bg-pink-50 dark:bg-pink-900/20" 
                : "text-slate-300 hover:text-pink-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
            title="Favorite this Act"
          >
            <Star size={20} className={isActFav ? "fill-pink-600" : ""} />
          </button>
        )}
      </div>
      
      {act.performers?.length > 0 && (
        <p className="mt-auto pt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          <span className="font-semibold">Performers:</span>{' '}
          {act.performers.map((p, i) => {
            const isDancerFav = favorites?.has(p);
            return (
              <span 
                key={i} 
                className={clsx(isDancerFav && "text-pink-600 dark:text-pink-400 font-bold")}
              >
                {p}{i < act.performers.length - 1 ? ', ' : ''}
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
}