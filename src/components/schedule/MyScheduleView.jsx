import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Heart, Star, Music, ArrowRight, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';

export default function MyScheduleView({ showData, currentAct, showId }) {
  const { favorites, toggleFavorite } = useApp();

  // Build a timeline of favorited acts in order
  const schedule = useMemo(() => {
    if (!showData?.acts || !favorites || favorites.size === 0) return [];
    const actKey = (num) => showId ? `act-${showId}-${num}` : `act-${num}`;

    return showData.acts
      .filter(act =>
        favorites.has(actKey(act.number)) ||
        act.performers?.some(p => favorites.has(p))
      )
      .map(act => ({
        ...act,
        favoritedDancers: act.performers?.filter(p => favorites.has(p)) || [],
        isActFav: favorites.has(actKey(act.number)),
        actKey: actKey(act.number),
      }));
  }, [showData, favorites, showId]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!showData?.acts) return { total: 0, favorited: 0, dancers: 0 };
    const dancerSet = new Set();
    schedule.forEach(act => {
      act.favoritedDancers.forEach(d => dancerSet.add(d));
    });
    return {
      total: showData.acts.length,
      favorited: schedule.length,
      dancers: dancerSet.size,
    };
  }, [showData, schedule]);

  if (!showData) {
    return (
      <div className="text-center py-20 bg-white dark:bg-ink-800 rounded-[2.5rem] border border-ink-100 dark:border-ink-700 shadow-sm">
        <Heart size={48} className="mx-auto text-ink-200 dark:text-ink-700 mb-4" />
        <p className="text-ink-400 font-bold">Select a performance to see your schedule.</p>
      </div>
    );
  }

  if (schedule.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-ink-800 rounded-[2.5rem] border border-ink-100 dark:border-ink-700 shadow-sm space-y-4">
        <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto">
          <Heart size={36} className="text-brand-300 dark:text-brand-700" />
        </div>
        <div>
          <h3 className="text-lg font-semibold dark:text-white mb-1">No favorites yet</h3>
          <p className="text-ink-400 text-sm max-w-sm mx-auto">
            Star your favorite acts or dancers from the program to build your personalized schedule.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-card font-bold text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-colors"
          >
            Browse Program <ArrowRight size={16} />
          </Link>
          <Link
            to="/search-dancers"
            className="inline-flex items-center gap-2 px-5 py-3 bg-ink-100 dark:bg-ink-700 text-ink-700 dark:text-white rounded-card font-bold text-sm hover:bg-ink-200 dark:hover:bg-ink-600 transition-colors"
          >
            Find Dancers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="px-0.5">
        <h2 className="text-xl sm:text-3xl font-semibold dark:text-white leading-tight">My Schedule</h2>
        <p className="text-ink-400 text-[10px] font-semibold uppercase tracking-widest mt-0.5">
          {showData.label}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-ink-800 p-3 sm:p-4 rounded-card sm:rounded-card border border-ink-100 dark:border-ink-700 text-center shadow-sm">
          <div className="text-xl sm:text-2xl font-semibold text-brand-600">{stats.favorited}</div>
          <div className="text-[8px] sm:text-[9px] font-semibold text-ink-400 uppercase tracking-wider mt-0.5">Acts</div>
        </div>
        <div className="bg-white dark:bg-ink-800 p-3 sm:p-4 rounded-card sm:rounded-card border border-ink-100 dark:border-ink-700 text-center shadow-sm">
          <div className="text-xl sm:text-2xl font-semibold text-brand-600">{stats.dancers}</div>
          <div className="text-[8px] sm:text-[9px] font-semibold text-ink-400 uppercase tracking-wider mt-0.5">Dancers</div>
        </div>
        <div className="bg-white dark:bg-ink-800 p-3 sm:p-4 rounded-card sm:rounded-card border border-ink-100 dark:border-ink-700 text-center shadow-sm">
          <div className="text-2xl font-semibold text-brand-600">
            {stats.total > 0 ? Math.round((stats.favorited / stats.total) * 100) : 0}%
          </div>
          <div className="text-[9px] font-semibold text-ink-400 uppercase tracking-wider mt-1">Of Show</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[14px] sm:left-6 top-0 bottom-0 w-0.5 bg-brand-100 dark:bg-brand-900/30" />

        <div className="space-y-4">
          {schedule.map((act) => {
            const isCurrent = currentAct?.isTracking && currentAct.number === act.number;
            const isPast = currentAct?.isTracking && currentAct.number > act.number;
            const isUpNext = currentAct?.isTracking && currentAct.number === act.number - 1;

            return (
              <div key={act.number} className="relative pl-10 sm:pl-14">
                {/* Timeline dot */}
                <div className={clsx(
                  "absolute left-[6px] sm:left-[18px] top-5 w-5 h-5 rounded-full border-[3px] z-10 transition-all",
                  isCurrent
                    ? "bg-brand-600 border-brand-300 scale-125 shadow-lg shadow-brand-500/40 animate-pulse"
                    : isPast
                      ? "bg-brand-400 border-brand-200"
                      : "bg-white dark:bg-ink-800 border-brand-300 dark:border-brand-700"
                )} />

                <div className={clsx(
                  "p-5 rounded-card border transition-all",
                  isCurrent
                    ? "bg-brand-600 border-brand-500 text-white shadow-xl shadow-brand-500/20 scale-[1.02]"
                    : isPast
                      ? "bg-ink-50 dark:bg-ink-800/50 border-ink-100 dark:border-ink-700 opacity-60"
                      : "bg-white dark:bg-ink-800 border-ink-100 dark:border-ink-700 shadow-sm"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-10 h-10 rounded-card flex items-center justify-center font-semibold text-sm shrink-0",
                        isCurrent
                          ? "bg-white/20"
                          : "bg-brand-50 dark:bg-brand-900/30 text-brand-600"
                      )}>
                        {act.number}
                      </div>
                      <div>
                        <div className={clsx(
                          "font-semibold text-base leading-tight",
                          isCurrent ? "text-white" : "dark:text-white"
                        )}>
                          {act.title}
                        </div>
                        {isUpNext && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md mt-1">
                            <Clock size={10} /> Up Next
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleFavorite(act.actKey)}
                      className={clsx(
                        "p-2 rounded-card transition-colors shrink-0",
                        isCurrent ? "text-white/70 hover:text-white" : "text-brand-500"
                      )}
                    >
                      <Star size={18} fill={act.isActFav ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {/* Favorited dancers highlight */}
                  {act.favoritedDancers.length > 0 && (
                    <div className={clsx(
                      "mt-3 flex flex-wrap gap-1.5",
                    )}>
                      {act.favoritedDancers.map(dancer => (
                        <span
                          key={dancer}
                          className={clsx(
                            "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg",
                            isCurrent
                              ? "bg-white/20 text-white"
                              : "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400"
                          )}
                        >
                          <Heart size={10} fill="currentColor" />
                          {dancer}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Non-favorited performers */}
                  {act.performers?.length > act.favoritedDancers.length && (
                    <div className={clsx(
                      "mt-2 text-xs leading-relaxed",
                      isCurrent ? "text-white/60" : "text-ink-400"
                    )}>
                      +{act.performers.length - act.favoritedDancers.length} other performer{act.performers.length - act.favoritedDancers.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
