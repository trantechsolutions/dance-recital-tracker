import React from 'react';
import { Minus, Plus, Radio } from 'lucide-react';

export default function StickyHeader({ currentAct, isAuthorized, onUpdate }) {
  if (!currentAct.isTracking) return null;

  return (
    <div className="fixed top-0 left-0 right-0 md:left-64 z-50 flex justify-center pointer-events-none px-4 pt-3">
      <div className="pointer-events-auto flex items-center gap-3 bg-pink-600 text-white px-4 py-2.5 rounded-2xl shadow-xl shadow-pink-500/30 max-w-lg w-full">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Radio size={13} className="animate-pulse shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider whitespace-nowrap opacity-80">Live</span>
          <div className="bg-white/20 text-white px-2 py-0.5 rounded-lg font-mono font-black text-sm shrink-0">
            #{currentAct.number}
          </div>
          <span className="truncate text-sm font-bold opacity-90">{currentAct.title}</span>
        </div>

        {isAuthorized && (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => onUpdate(Math.max(1, currentAct.number - 1))}
              disabled={currentAct.number <= 1}
              aria-label="Previous act"
              className="w-8 h-8 bg-white/20 rounded-xl hover:bg-white/30 active:scale-90 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => onUpdate(currentAct.number + 1)}
              aria-label="Next act"
              className="w-8 h-8 bg-white/20 rounded-xl hover:bg-white/30 active:scale-90 transition-all flex items-center justify-center"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
