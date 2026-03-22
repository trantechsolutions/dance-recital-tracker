import React from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

export default function ActCard({ act, isCurrent, toggleFavorite, favorites, onClick }) {
  const isActFav = favorites?.has(`act-${act.number}`);
  const hasFavDancer = act.performers?.some(p => favorites?.has(p));
  const isHighlighted = isActFav || hasFavDancer;

  return (
    <div
      data-current-act={isCurrent ? "true" : undefined}
      onClick={onClick}
      className={clsx(
        "p-5 rounded-[2rem] border transition-all duration-500 flex flex-col gap-2 relative overflow-hidden group",
        onClick && "cursor-pointer",
        isCurrent
          ? "bg-pink-600 border-pink-500 shadow-xl shadow-pink-500/20 scale-[1.02] z-10"
          : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-pink-200 dark:hover:border-pink-800",
        isHighlighted && !isCurrent && "border-l-4 border-l-pink-600"
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={clsx(
            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 transition-colors",
            isCurrent
              ? "bg-white text-pink-600"
              : isHighlighted
                ? "bg-pink-100 dark:bg-pink-900/40 text-pink-600"
                : "bg-slate-50 dark:bg-slate-900 text-slate-400"
          )}>
            {act.number}
          </div>
          <div className={clsx(
            "font-black text-lg leading-tight truncate",
            isCurrent ? "text-white" : isHighlighted ? "text-pink-600 dark:text-pink-400" : "dark:text-white"
          )}>
            {act.title}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(`act-${act.number}`);
            }}
            className={clsx(
              "p-3 rounded-xl transition-colors",
              isCurrent
                ? "text-pink-200 hover:text-white"
                : isActFav ? "text-pink-600 bg-pink-50 dark:bg-pink-900/20" : "text-slate-300 hover:text-pink-600"
            )}
          >
            <Star size={20} fill={isActFav ? "currentColor" : "none"} />
          </button>
          {onClick && (
            <ChevronRight size={18} className={clsx(
              "transition-all opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
              isCurrent ? "text-white/50" : "text-slate-300"
            )} />
          )}
        </div>
      </div>

      {act.performers?.length > 0 && (
        <div className={clsx(
          "pl-16 text-sm leading-relaxed",
          isCurrent ? "text-pink-100" : "text-slate-500 dark:text-slate-400"
        )}>
          {act.performers.map((p, i) => {
            const isDancerFav = favorites?.has(p);
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

      {/* Performer count badge */}
      {act.performers?.length > 0 && (
        <div className={clsx(
          "pl-16",
        )}>
          <span className={clsx(
            "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md",
            isCurrent
              ? "bg-white/15 text-white/70"
              : "bg-slate-50 dark:bg-slate-900 text-slate-400"
          )}>
            {act.performers.length} performer{act.performers.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
