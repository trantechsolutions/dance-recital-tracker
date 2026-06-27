import React from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '../../context/AppContext';

export default function ActCard({ act, isCurrent, toggleFavorite, favorites, onClick, showId }) {
  const { user } = useApp();
  const actKey = showId ? `act-${showId}-${act.number}` : `act-${act.number}`;
  const isActFav = favorites?.has(actKey);
  const hasFavDancer = act.performers?.some(p => favorites?.has(p));
  const isHighlighted = isActFav || hasFavDancer;

  return (
    <div
      data-current-act={isCurrent ? 'true' : undefined}
      onClick={onClick}
      className={clsx(
        "relative rounded-card border transition-all duration-300 overflow-hidden group",
        onClick && "cursor-pointer active:scale-[0.99]",
        isCurrent
          ? "bg-brand-100 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 shadow-lg shadow-brand-500/20 z-10"
          : isHighlighted
            ? "bg-white dark:bg-ink-800 border-brand-200 dark:border-brand-800/60 shadow-program hover:border-brand-300"
            : "bg-white dark:bg-ink-800 border-ink-100 dark:border-ink-700 shadow-program hover:border-ink-200 dark:hover:border-ink-600"
      )}
    >
      {/* Highlighted left accent bar */}
      {isHighlighted && !isCurrent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />
      )}

      <div className="px-4 py-4 sm:px-5 sm:py-5 flex items-center gap-4">
        {/* Act number badge — display serif numeral */}
        <div className={clsx(
          "w-12 h-12 rounded-card flex items-center justify-center font-display text-2xl shrink-0 transition-colors leading-none",
          isCurrent
            ? "bg-brand-200 dark:bg-brand-800/50 text-brand-800 dark:text-brand-200"
            : isHighlighted
              ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"
              : "bg-ink-50 dark:bg-ink-900 text-ink-500 dark:text-ink-400"
        )}>
          {act.number}
        </div>

        {/* Title + performers */}
        <div className="flex-1 min-w-0">
          <p className={clsx(
            "font-display text-lg sm:text-xl font-medium italic leading-snug",
            isCurrent ? "text-brand-900 dark:text-brand-100" : isHighlighted ? "text-brand-800 dark:text-brand-200" : "text-ink-900 dark:text-white"
          )}>
            {act.title}
          </p>

          {user && act.performers?.length > 0 && (
            <span className={clsx(
              "inline-flex items-center mt-2 text-xs font-medium",
              isCurrent ? "text-brand-500 dark:text-brand-400" : "text-ink-400"
            )}>
              {act.performers.length} performer{act.performers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="relative flex items-center shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(actKey); }}
            aria-label={isActFav ? 'Remove from favorites' : 'Add to favorites'}
            className={clsx(
              "w-11 h-11 rounded-card flex items-center justify-center transition-all active:scale-90",
              isCurrent
                ? "text-brand-600 dark:text-brand-300 hover:text-brand-700 hover:bg-brand-200/60 dark:hover:bg-brand-800/40"
                : isActFav
                  ? "text-brand-600 bg-brand-50 dark:bg-brand-900/20"
                  : "text-ink-300 dark:text-ink-600 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/10"
            )}
          >
            <Star size={20} fill={isActFav ? 'currentColor' : 'none'} />
          </button>
          {onClick && (
            <ChevronRight size={15} className={clsx(
              "hidden sm:block absolute left-full top-1/2 -translate-y-1/2 transition-all opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
              isCurrent ? "text-brand-400" : "text-ink-300"
            )} />
          )}
        </div>
      </div>
    </div>
  );
}
