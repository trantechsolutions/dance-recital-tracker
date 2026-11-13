import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Minus, Plus, LocateFixed } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '../../context/AppContext';
import { displayName } from '../../utils/names';
import { getLiveStatus, liveInstruction, scrollToCurrentAct } from '../../utils/liveProgress';
import { typicalActMs, minutesAway } from '../../utils/showControl';

// The single "live" signal in the app: docked above the mobile nav (bottom of
// the content column on desktop). Big act number on stage, plus one plain
// instruction about the viewer's next act — "Head back after act 15."
export default function LiveBar({ showData, showId, currentAct, actLog, favorites, isAuthorized, onUpdate }) {
  const { canViewFullNames } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentAct?.isTracking || !showData) return null;

  const status = getLiveStatus(showData, currentAct, favorites, showId);
  const eta = minutesAway(status.actsAway, typicalActMs(actLog));
  const instruction = liveInstruction(status, (n) => displayName(n, canViewFullNames), eta);
  const mineOnStage = status.phase === 'onstage';
  const urgent = status.phase === 'next' || status.phase === 'soon';

  const { intermission } = status;
  const nextLine = status.upNext
    ? `${intermission ? 'After the break' : 'Up next'}: ${status.upNext.number} ${status.upNext.title}`
    : 'Last act of the show.';
  const secondLine = (instruction && (intermission ? `After the break: ${instruction}` : instruction))
    || (status.phase === 'done' ? 'All of your acts are done.' : null)
    || nextLine;

  const goToAct = () => {
    if (location.pathname === '/') scrollToCurrentAct();
    else navigate('/', { state: { jumpToLive: true } });
  };

  return (
    <div
      className="fixed inset-x-2 md:left-[calc(16rem+1rem)] md:right-4 z-40 bottom-[calc(64px+env(safe-area-inset-bottom,0px))] md:bottom-4 print:hidden"
    >
      <div
        className={clsx(
          "max-w-3xl mx-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-card shadow-xl border transition-colors duration-500",
          mineOnStage
            ? "bg-brand-800 border-brand-600 text-white"
            : "bg-ink-900 border-ink-700 text-white dark:bg-ink-950"
        )}
      >
        {intermission ? (
          <span className="font-display italic text-lg leading-none text-stage-300 shrink-0">Break</span>
        ) : (
          <>
            <span className="sr-only">On stage now:</span>
            <span className="font-display font-black text-3xl leading-none tabular-nums text-stage-300 shrink-0 min-w-[2ch] text-center">
              {currentAct.number}
            </span>
          </>
        )}

        <div className="flex-1 min-w-0" role="status" aria-live="polite">
          <p className="font-display italic text-[15px] leading-tight truncate text-white/95">
            {intermission ? 'Intermission' : currentAct.title}
          </p>
          <p className={clsx(
            "text-xs font-semibold leading-snug mt-0.5 line-clamp-2",
            mineOnStage ? "text-white" : urgent ? "text-stage-300" : instruction ? "text-brand-300" : "text-ink-300"
          )}>
            {secondLine}
          </p>
        </div>

        <button
          type="button"
          onClick={goToAct}
          aria-label={intermission ? 'Go to the next act' : 'Go to the act on stage'}
          className="shrink-0 h-11 px-3 rounded-card bg-stage-400 text-ink-900 text-sm font-semibold flex items-center gap-1.5 hover:bg-stage-300 active:scale-95 transition"
        >
          <LocateFixed size={16} />
          <span className={clsx(isAuthorized ? "hidden sm:inline" : "inline")}>Go to act</span>
        </button>

        {isAuthorized && (
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onUpdate(Math.max(1, currentAct.number - 1))}
              disabled={currentAct.number <= 1}
              aria-label="Previous act"
              className="w-11 h-11 bg-white/10 rounded-card hover:bg-white/20 active:scale-90 transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={() => onUpdate(currentAct.number + 1)}
              aria-label="Next act"
              className="w-11 h-11 bg-white/15 rounded-card hover:bg-white/25 active:scale-90 transition flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
