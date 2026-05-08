import React from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

export default function ActCard({ act, isCurrent, toggleFavorite, favorites, onClick, showId }) {
  const actKey = showId ? `act-${showId}-${act.number}` : `act-${act.number}`;
  const isActFav = favorites?.has(actKey);
  const hasFavDancer = act.performers?.some(p => favorites?.has(p));
  const isHighlighted = isActFav || hasFavDancer;

  return (
    <div
      data-current-act={isCurrent ? 'true' : undefined}
      onClick={onClick}
      className={clsx(
        "relative rounded-2xl border transition-all duration-300 overflow-hidden group",
        onClick && "cursor-pointer active:scale-[0.985]",
        isCurrent
          ? "bg-gradient-to-br from-pink-600 to-rose-600 border-transparent shadow-xl shadow-pink-500/25 scale-[1.01] z-10"
          : isHighlighted
            ? "bg-white dark:bg-slate-800 border-pink-200 dark:border-pink-800/60 shadow-sm hover:shadow-md"
            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600"
      )}
    >
      {/* Highlighted left accent bar */}
      {isHighlighted && !isCurrent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500 rounded-l-2xl" />
      )}

      <div className="px-4 py-4 sm:px-5 sm:py-5 flex items-start gap-3">
        {/* Act number badge */}
        <div className={clsx(
          "w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors",
          isCurrent
            ? "bg-white/20 text-white"
            : isHighlighted
              ? "bg-pink-100 dark:bg-pink-900/40 text-pink-600"
              : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400"
        )}>
          {act.number}
        </div>

        {/* Title + performers */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={clsx(
            "font-black text-base sm:text-lg leading-tight",
            isCurrent ? "text-white" : isHighlighted ? "text-pink-700 dark:text-pink-300" : "text-slate-900 dark:text-white"
          )}>
            {act.title}
          </p>

          {act.performers?.length > 0 && (
            <p className={clsx(
              "text-sm mt-1 leading-snug line-clamp-2",
              isCurrent ? "text-pink-100" : "text-slate-500 dark:text-slate-400"
            )}>
              {act.performers.map((p, i) => {
                const isDancerFav = favorites?.has(p);
                return (
                  <span
                    key={i}
                    className={clsx(isDancerFav && !isCurrent && "text-pink-600 dark:text-pink-400 font-semibold")}
                  >
                    {p}{i < act.performers.length - 1 ? ', ' : ''}
                  </span>
                );
              })}
            </p>
          )}

          {act.performers?.length > 0 && (
            <span className={clsx(
              "inline-flex items-center mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md",
              isCurrent
                ? "bg-white/15 text-white/70"
                : "bg-slate-50 dark:bg-slate-900 text-slate-400"
            )}>
              {act.performers.length} performer{act.performers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(actKey); }}
            aria-label={isActFav ? 'Remove from favorites' : 'Add to favorites'}
            className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
              isCurrent
                ? "text-pink-200 hover:text-white hover:bg-white/10"
                : isActFav
                  ? "text-pink-600 bg-pink-50 dark:bg-pink-900/20"
                  : "text-slate-300 dark:text-slate-600 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/10"
            )}
          >
            <Star size={19} fill={isActFav ? 'currentColor' : 'none'} />
          </button>
          {onClick && (
            <ChevronRight size={15} className={clsx(
              "hidden sm:block transition-all opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
              isCurrent ? "text-white/50" : "text-slate-300"
            )} />
          )}
        </div>
      </div>
    </div>
  );
}
