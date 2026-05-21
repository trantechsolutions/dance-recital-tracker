import React from 'react';
import { Minus, Plus, Radio } from 'lucide-react';

export default function StickyHeader({ currentAct, isAuthorized, onUpdate }) {
  if (!currentAct.isTracking) return null;

  return (
    <div className="fixed top-0 left-0 right-0 md:left-64 z-50 flex justify-center pointer-events-none px-4 pt-3">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex items-center gap-3 bg-ink-900 text-white px-4 py-2.5 rounded-card shadow-stage border border-stage-500/40 max-w-lg w-full"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 bg-stage-500 text-ink-900 px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-marquee shrink-0">
            <Radio size={10} className="animate-pulse" />
            Live
          </span>
          <span className="text-stage-300 font-display text-lg leading-none shrink-0">
            {currentAct.number}
          </span>
          <span className="truncate text-sm font-display italic text-white/90">{currentAct.title}</span>
        </div>

        {isAuthorized && (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => onUpdate(Math.max(1, currentAct.number - 1))}
              disabled={currentAct.number <= 1}
              aria-label="Previous act"
              className="w-11 h-11 bg-white/10 rounded-card hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={() => onUpdate(currentAct.number + 1)}
              aria-label="Next act"
              className="w-11 h-11 bg-stage-500 text-ink-900 rounded-card hover:bg-stage-400 active:scale-90 transition-all flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
