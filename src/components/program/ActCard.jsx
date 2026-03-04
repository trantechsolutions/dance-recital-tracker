import React from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';

export default function ActCard({ act, isCurrent, toggleFavorite, favorites }) {
  // Check if the specific act ID is favorited
  const isActFav = favorites?.has(`act-${act.number}`);
  // Check if any individual performer in this act is in the favorites Set
  const hasFavDancer = act.performers?.some(p => favorites?.has(p));
  
  // The card is considered highlighted if a dancer or the act itself is favorited
  const isHighlighted = isActFav || hasFavDancer;

  return (
    <div className={clsx(
      "p-5 rounded-[2rem] border transition-all duration-500 flex flex-col gap-2 relative overflow-hidden",
      isCurrent 
        ? "bg-pink-600 border-pink-500 shadow-xl shadow-pink-500/20 scale-[1.02] z-10" 
        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm",
      // Highlight indicator for favorited items
      isHighlighted && !isCurrent && "border-l-4 border-l-pink-600"
    )}>
      
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          {/* Highlighted Act Number */}
          <div className={clsx(
            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 transition-colors",
            isCurrent 
              ? "bg-white text-pink-600" 
              : isHighlighted 
                ? "bg-pink-100 dark:bg-pink-900/40 text-pink-600" // Highlighted state
                : "bg-slate-50 dark:bg-slate-900 text-slate-400"  // Default state
          )}>
            {act.number}
          </div>
          <div className={clsx(
            "font-black text-lg leading-tight", 
            isCurrent ? "text-white" : isHighlighted ? "text-pink-600 dark:text-pink-400" : "dark:text-white"
          )}>
            {act.title}
          </div>
        </div>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(`act-${act.number}`); //
          }}
          className={clsx(
            "p-3 rounded-xl transition-colors shrink-0",
            isCurrent 
              ? "text-pink-200 hover:text-white" 
              : isActFav ? "text-pink-600 bg-pink-50 dark:bg-pink-900/20" : "text-slate-300 hover:text-pink-600"
          )}
        >
          <Star size={20} fill={isActFav ? "currentColor" : "none"} />
        </button>
      </div>
      
      {act.performers?.length > 0 && (
        <div className={clsx(
          "pl-16 text-sm leading-relaxed",
          isCurrent ? "text-pink-100" : "text-slate-500 dark:text-slate-400"
        )}>
          {act.performers.map((p, i) => {
            const isDancerFav = favorites?.has(p); //
            return (
              <span 
                key={i} 
                className={clsx(
                  isDancerFav && !isCurrent && "text-pink-600 dark:text-pink-400 font-bold underline decoration-pink-500/30"
                )}
              >
                {p}{i < act.performers.length - 1 ? ', ' : ''}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}