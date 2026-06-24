import React, { useEffect, useCallback } from 'react';
import { X, SkipBack, SkipForward, Radio, Music } from 'lucide-react';
import { clsx } from 'clsx';

export default function LiveShowController({ showData, currentAct, updateActNumber, toggleTracking, onClose }) {
  const acts = showData?.acts || [];
  const totalActs = acts.length;
  const actNum = currentAct?.number ?? 1;
  const isTracking = currentAct?.isTracking ?? false;

  const currentActData = acts.find(a => Number(a.number) === Number(actNum));
  const upcomingActs = acts
    .filter(a => Number(a.number) > Number(actNum))
    .slice(0, 3);

  const handlePrev = useCallback(() => {
    if (actNum > 1) updateActNumber(actNum - 1);
  }, [actNum, updateActNumber]);

  const handleNext = useCallback(() => {
    if (actNum < totalActs) updateActNumber(actNum + 1);
  }, [actNum, totalActs, updateActNumber]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNext, handlePrev, onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-ink-950 text-white flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-800">
        <div className="flex items-center gap-2">
          <Radio size={16} className={clsx(isTracking ? "text-brand-500 animate-pulse" : "text-ink-600")} />
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-400">
            {isTracking ? 'Live' : 'Paused'} — {showData?.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTracking}
            className={clsx(
              "px-4 py-1.5 rounded-card text-xs font-semibold uppercase tracking-wider transition-all",
              isTracking
                ? "bg-ink-700 hover:bg-ink-600 text-ink-300"
                : "bg-brand-600 hover:bg-brand-500 text-white"
            )}
          >
            {isTracking ? 'Pause Broadcast' : 'Go Live'}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-ink-500 hover:text-white transition-colors rounded-card"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main stage */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 py-10 text-center">
        {/* Act number badge */}
        <div className="w-24 h-24 rounded-card bg-brand-600 flex items-center justify-center shadow-2xl shadow-brand-600/30">
          <span className="text-4xl font-semibold">{actNum}</span>
        </div>

        {/* Act title */}
        <div className="space-y-2 max-w-lg">
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
            {currentActData?.title || 'Act not found'}
          </h1>
          {currentActData?.performers?.length > 0 && (
            <p className="text-ink-400 text-base leading-relaxed">
              {currentActData.performers.join(' · ')}
            </p>
          )}
        </div>

        {/* Act counter */}
        <p className="text-ink-500 text-sm font-bold">
          Act {actNum} of {totalActs}
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-sm h-1.5 bg-ink-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-500"
            style={{ width: totalActs > 0 ? `${(actNum / totalActs) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center gap-6 px-8 py-8 border-t border-ink-800">
        <button
          onClick={handlePrev}
          disabled={actNum <= 1}
          className="flex items-center gap-2 px-8 py-4 bg-ink-800 hover:bg-ink-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-card font-bold text-lg transition-all active:scale-95"
        >
          <SkipBack size={24} /> Prev
        </button>
        <button
          onClick={handleNext}
          disabled={actNum >= totalActs}
          className="flex items-center gap-2 px-10 py-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-card font-bold text-xl shadow-lg shadow-brand-600/30 transition-all active:scale-95"
        >
          Next <SkipForward size={24} />
        </button>
      </div>

      {/* Upcoming acts */}
      {upcomingActs.length > 0 && (
        <div className="px-8 pb-8 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-600 mb-3">Up Next</p>
          {upcomingActs.map((act) => (
            <button
              key={act.number}
              onClick={() => updateActNumber(act.number)}
              className="w-full flex items-center gap-3 p-3 bg-ink-900 hover:bg-ink-800 rounded-card transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-ink-800 group-hover:bg-ink-700 flex items-center justify-center text-xs font-semibold text-ink-400 shrink-0 transition-colors">
                {act.number}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-ink-300 truncate">{act.title}</div>
                {act.performers?.length > 0 && (
                  <div className="text-xs text-ink-600 truncate">{act.performers.slice(0, 3).join(', ')}{act.performers.length > 3 ? ` +${act.performers.length - 3}` : ''}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      <div className="pb-6 text-center">
        <p className="text-[10px] text-ink-700 font-bold tracking-widest uppercase">
          ← → Arrow keys • Space = Next • Esc = Close
        </p>
      </div>
    </div>
  );
}
