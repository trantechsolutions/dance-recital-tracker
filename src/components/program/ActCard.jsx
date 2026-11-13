import React from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '../../context/AppContext';
import { displayName } from '../../utils/names';

// `aside` is a short live-status label ("Up next", "In 5 acts") shown under the title.
export default function ActCard({ act, isCurrent, toggleFavorite, favorites, onClick, showId, aside, scrollTarget }) {
  const { user, canViewFullNames } = useApp();
  const actKey = showId ? `act-${showId}-${act.number}` : `act-${act.number}`;
  const isActFav = favorites?.has(actKey);
  const favDancers = act.performers?.filter(p => favorites?.has(p)) || [];
  const hasFavDancer = favDancers.length > 0;
  const isHighlighted = isActFav || hasFavDancer;

  return (
    <div
      data-current-act={isCurrent || scrollTarget ? 'true' : undefined}
      onClick={onClick}
      className={clsx(
        "relative rounded-card border transition-all duration-300 overflow-hidden group",
        onClick && "cursor-pointer active:scale-[0.99]",
        isCurrent
          ? "bg-stage-50 dark:bg-stage-900/25 border-stage-400 dark:border-stage-600 border-2 shadow-stage z-10"
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
            ? "bg-stage-200 dark:bg-stage-800/50 text-stage-900 dark:text-stage-100"
            : isHighlighted
              ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"
              : "bg-ink-50 dark:bg-ink-900 text-ink-500 dark:text-ink-400"
        )}>
          {act.number}
        </div>

        {/* Title + performers */}
        <div className="flex-1 min-w-0">
          {isCurrent && (
            <p className="text-xs font-semibold text-stage-700 dark:text-stage-300 mb-0.5">On stage now</p>
          )}
          <p className={clsx(
            "font-display text-lg sm:text-xl font-medium italic leading-snug",
            isCurrent ? "text-ink-900 dark:text-stage-50" : isHighlighted ? "text-brand-800 dark:text-brand-200" : "text-ink-900 dark:text-white"
          )}>
            {act.title}
          </p>

          {(favDancers.length > 0 || aside || (user && act.performers?.length > 0)) && (
            <p className="mt-1.5 text-xs font-medium flex flex-wrap gap-x-3 gap-y-0.5">
              {favDancers.length > 0 && (
                <span className="font-semibold text-brand-700 dark:text-brand-300">
                  {favDancers.map(d => displayName(d, canViewFullNames)).join(', ')}
                </span>
              )}
              {aside && <span className="font-semibold text-ink-700 dark:text-ink-200">{aside}</span>}
              {user && act.performers?.length > 0 && (
                <span className="text-ink-500 dark:text-ink-400">
                  {act.performers.length} performer{act.performers.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="relative flex items-center shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(actKey); }}
            aria-label={isActFav ? 'Saved. Tap to unsave this act' : 'Save this act'}
            aria-pressed={!!isActFav}
            className={clsx(
              "w-11 h-11 rounded-card flex items-center justify-center transition-all active:scale-90",
              isCurrent
                ? (isActFav ? "text-brand-600 dark:text-brand-300" : "text-stage-700 dark:text-stage-300") + " hover:bg-stage-100 dark:hover:bg-stage-800/40"
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
              isCurrent ? "text-stage-500" : "text-ink-300"
            )} />
          )}
        </div>
      </div>
    </div>
  );
}
