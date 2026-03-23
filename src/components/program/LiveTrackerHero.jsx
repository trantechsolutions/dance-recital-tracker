import React from 'react';
import { Music } from 'lucide-react';

export default function LiveTrackerHero({ currentAct }) {
  // Only show when tracking is active — display-only for all users
  if (!currentAct?.isTracking) return null;

  return (
    <div className="mb-4 sm:mb-8">
      <div className="relative bg-gradient-to-br from-pink-600 via-pink-600 to-rose-700 p-6 sm:p-8 rounded-xl sm:rounded-2xl text-white shadow-xl shadow-pink-500/20 text-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-xl" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/5 rounded-full blur-2xl" />
          <Music size={80} className="absolute -right-4 -bottom-4 text-white/[0.04] rotate-12" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <span className="text-[9px] uppercase tracking-[0.15em] font-black opacity-90">Live</span>
          </div>

          <div className="text-5xl sm:text-7xl font-black mb-1 tracking-tighter drop-shadow-lg">#{currentAct.number}</div>
          <div className="text-base sm:text-xl font-bold opacity-90">{currentAct.title}</div>
        </div>
      </div>
    </div>
  );
}
