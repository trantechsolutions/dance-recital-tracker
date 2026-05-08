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
    <div className="fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Radio size={16} className={clsx(isTracking ? "text-pink-500 animate-pulse" : "text-slate-600")} />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            {isTracking ? 'Live' : 'Paused'} — {showData?.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTracking}
            className={clsx(
              "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              isTracking
                ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                : "bg-pink-600 hover:bg-pink-500 text-white"
            )}
          >
            {isTracking ? 'Pause Broadcast' : 'Go Live'}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-colors rounded-xl"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main stage */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 py-10 text-center">
        {/* Act number badge */}
        <div className="w-24 h-24 rounded-3xl bg-pink-600 flex items-center justify-center shadow-2xl shadow-pink-600/30">
          <span className="text-4xl font-black">{actNum}</span>
        </div>

        {/* Act title */}
        <div className="space-y-2 max-w-lg">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            {currentActData?.title || 'Act not found'}
          </h1>
          {currentActData?.performers?.length > 0 && (
            <p className="text-slate-400 text-base leading-relaxed">
              {currentActData.performers.join(' · ')}
            </p>
          )}
        </div>

        {/* Act counter */}
        <p className="text-slate-500 text-sm font-bold">
          Act {actNum} of {totalActs}
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-sm h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-pink-600 rounded-full transition-all duration-500"
            style={{ width: totalActs > 0 ? `${(actNum / totalActs) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center gap-6 px-8 py-8 border-t border-slate-800">
        <button
          onClick={handlePrev}
          disabled={actNum <= 1}
          className="flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-bold text-lg transition-all active:scale-95"
        >
          <SkipBack size={24} /> Prev
        </button>
        <button
          onClick={handleNext}
          disabled={actNum >= totalActs}
          className="flex items-center gap-2 px-10 py-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-bold text-xl shadow-lg shadow-pink-600/30 transition-all active:scale-95"
        >
          Next <SkipForward size={24} />
        </button>
      </div>

      {/* Upcoming acts */}
      {upcomingActs.length > 0 && (
        <div className="px-8 pb-8 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Up Next</p>
          {upcomingActs.map((act) => (
            <button
              key={act.number}
              onClick={() => updateActNumber(act.number)}
              className="w-full flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-400 shrink-0 transition-colors">
                {act.number}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-300 truncate">{act.title}</div>
                {act.performers?.length > 0 && (
                  <div className="text-xs text-slate-600 truncate">{act.performers.slice(0, 3).join(', ')}{act.performers.length > 3 ? ` +${act.performers.length - 3}` : ''}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      <div className="pb-6 text-center">
        <p className="text-[10px] text-slate-700 font-bold tracking-widest uppercase">
          ← → Arrow keys • Space = Next • Esc = Close
        </p>
      </div>
    </div>
  );
}
