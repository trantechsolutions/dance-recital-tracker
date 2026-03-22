import React from 'react';
import { Minus, Plus, Radio, Music } from 'lucide-react';
import { clsx } from 'clsx';

export default function LiveTrackerHero({ currentAct, isAuthorized, onUpdate, onToggle }) {
  if (!currentAct.isTracking && !isAuthorized) return null;

  return (
    <div className="mb-8">
      {isAuthorized && (
        <button
          onClick={onToggle}
          className={clsx(
            "w-full py-3.5 mb-4 rounded-2xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]",
            currentAct.isTracking
              ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
              : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
          )}
        >
          <Radio size={18} className={currentAct.isTracking ? "animate-pulse" : ""} />
          {currentAct.isTracking ? 'Stop Live Tracking' : 'Start Live Tracking'}
        </button>
      )}

      {currentAct.isTracking && (
        <div className="relative bg-gradient-to-br from-pink-600 via-pink-600 to-rose-700 p-8 rounded-[2rem] text-white shadow-2xl shadow-pink-500/30 text-center overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
            <Music size={120} className="absolute -right-6 -bottom-6 text-white/[0.04] rotate-12" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full mb-4">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-90">Now Performing</span>
            </div>

            <div className="text-7xl font-black mb-2 tracking-tighter drop-shadow-lg">#{currentAct.number}</div>
            <div className="text-xl font-bold opacity-90 mb-6">{currentAct.title}</div>

            {isAuthorized && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => onUpdate(currentAct.number - 1)}
                  disabled={currentAct.number <= 1}
                  className="w-14 h-14 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all shadow-inner active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus size={28} strokeWidth={3} />
                </button>
                <button
                  onClick={() => onUpdate(currentAct.number + 1)}
                  className="w-14 h-14 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all shadow-inner active:scale-90"
                >
                  <Plus size={28} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
