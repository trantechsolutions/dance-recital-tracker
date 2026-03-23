import React from 'react';
import { Minus, Plus, Radio, Music } from 'lucide-react';
import { clsx } from 'clsx';

export default function LiveTrackerHero({ currentAct, isAuthorized, onUpdate, onToggle }) {
  if (!currentAct.isTracking && !isAuthorized) return null;

  return (
    <div className="mb-4 sm:mb-8">
      {isAuthorized && (
        <button
          onClick={onToggle}
          className={clsx(
            "w-full py-3 mb-3 sm:mb-4 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98] text-sm",
            currentAct.isTracking
              ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
              : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
          )}
        >
          <Radio size={16} className={currentAct.isTracking ? "animate-pulse" : ""} />
          {currentAct.isTracking ? 'Stop Live Tracking' : 'Start Live Tracking'}
        </button>
      )}

      {currentAct.isTracking && (
        <div className="relative bg-gradient-to-br from-pink-600 via-pink-600 to-rose-700 p-6 sm:p-8 rounded-xl sm:rounded-2xl text-white shadow-xl shadow-pink-500/20 text-center overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-xl" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/5 rounded-full blur-2xl" />
            <Music size={80} className="absolute -right-4 -bottom-4 text-white/[0.04] rotate-12" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-[9px] uppercase tracking-[0.15em] font-black opacity-90">Now Performing</span>
            </div>

            <div className="text-5xl sm:text-7xl font-black mb-1 tracking-tighter drop-shadow-lg">#{currentAct.number}</div>
            <div className="text-base sm:text-xl font-bold opacity-90 mb-4 sm:mb-6">{currentAct.title}</div>

            {isAuthorized && (
              <div className="flex justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => onUpdate(currentAct.number - 1)}
                  disabled={currentAct.number <= 1}
                  className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all active:scale-90 disabled:opacity-30"
                >
                  <Minus size={24} strokeWidth={3} />
                </button>
                <button
                  onClick={() => onUpdate(currentAct.number + 1)}
                  className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all active:scale-90"
                >
                  <Plus size={24} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
