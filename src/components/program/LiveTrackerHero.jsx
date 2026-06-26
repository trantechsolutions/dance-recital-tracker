import React, { useMemo } from 'react';
import { Radio, Heart } from 'lucide-react';

export default function LiveTrackerHero({ currentAct, favorites, showData, showId }) {
  if (!currentAct?.isTracking) return null;

  // Find the next act the user has a favorite in (dancer or act-level)
  const nextFavorite = useMemo(() => {
    if (!favorites?.size || !showData?.acts || !currentAct?.number) return null;
    const actKey = (num) => showId ? `act-${showId}-${num}` : `act-${num}`;
    return showData.acts.find(act =>
      act.number > currentAct.number &&
      (favorites.has(actKey(act.number)) || act.performers?.some(p => favorites.has(p)))
    ) ?? null;
  }, [favorites, showData, currentAct?.number, showId]);

  const actsAway = nextFavorite ? nextFavorite.number - currentAct.number : null;

  return (
    <div className="mb-5 sm:mb-8">
      <div className="relative bg-brand-100 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 rounded-card text-brand-900 dark:text-brand-100 shadow-lg shadow-brand-500/20 overflow-hidden">
        <div className="relative z-10 px-5 py-7 sm:px-8 sm:py-10 text-center">
          {/* Live badge — pill is reserved for status */}
          <div className="inline-flex items-center gap-2 bg-brand-600 text-white px-3 py-1 rounded-pill mb-5 shadow-sm">
            <Radio size={11} className="animate-pulse" />
            <span className="text-[10px] uppercase tracking-marquee font-bold">Now Performing</span>
          </div>

          {/* Act number — the one moment of font-black weight */}
          <div className="font-display font-black text-7xl sm:text-9xl tracking-tight leading-[0.9] mb-3 text-brand-900 dark:text-brand-100">
            {currentAct.number}
          </div>

          {/* Act title — display serif, theatrical */}
          <div className="font-display text-xl sm:text-3xl font-medium italic leading-tight px-4 text-brand-800/90 dark:text-brand-200">
            {currentAct.title}
          </div>

          {/* Next favorite callout */}
          {nextFavorite && actsAway !== null && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/60 dark:bg-brand-900/40 px-4 py-2 rounded-pill text-sm text-brand-800 dark:text-brand-200">
              <Heart size={13} fill="currentColor" className="text-brand-500 shrink-0" />
              <span>
                {actsAway === 1
                  ? <>Your favorite is <span className="font-semibold text-brand-700 dark:text-brand-300">up next</span> — <span className="font-display italic">{nextFavorite.title}</span></>
                  : <><span className="font-semibold text-brand-700 dark:text-brand-300">{actsAway} acts</span> until <span className="font-display italic">{nextFavorite.title}</span></>
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
