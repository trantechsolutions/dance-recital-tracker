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
      <div className="relative bg-gradient-to-br from-pink-500 via-pink-600 to-rose-600 rounded-2xl sm:rounded-3xl text-white shadow-2xl shadow-pink-500/30 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/[0.06] rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-rose-400/20 rounded-full blur-3xl" />
          <div className="absolute top-0 left-1/3 w-px h-full bg-white/5" />
        </div>

        <div className="relative z-10 px-5 py-6 sm:px-8 sm:py-8 text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3.5 py-1.5 rounded-full mb-4">
            <Radio size={11} className="animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-black">Now Performing</span>
          </div>

          {/* Act number */}
          <div className="text-6xl sm:text-8xl font-black tracking-tighter leading-none mb-2 drop-shadow-lg">
            #{currentAct.number}
          </div>

          {/* Act title */}
          <div className="text-lg sm:text-2xl font-bold opacity-90 leading-tight px-4">
            {currentAct.title}
          </div>

          {/* Next favorite callout */}
          {nextFavorite && actsAway !== null && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold">
              <Heart size={13} fill="currentColor" className="text-pink-200 shrink-0" />
              <span>
                {actsAway === 1
                  ? <>Your favorite is <span className="text-white font-black">up next</span> — {nextFavorite.title}</>
                  : <><span className="text-white font-black">{actsAway} acts</span> until {nextFavorite.title}</>
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
