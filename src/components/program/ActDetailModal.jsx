import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { X, Star, Share2, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { displayName } from '../../utils/names';
import { stepAct, typicalActMs, minutesAway } from '../../utils/showControl';

// Act details as a bottom sheet (centred dialog on wide screens). Previous /
// next move through the running order without closing; live status uses the
// same amber "on stage" language as the rest of the app.
export default function ActDetailModal({
  act, isOpen, onClose, favorites, toggleFavorite, isCurrent, showId,
  acts, onNavigate, currentAct, actLog,
}) {
  const { user, canViewFullNames } = useApp();
  const closeButtonRef = useRef(null);
  const touchStart = useRef(null);

  const prev = acts && act ? stepAct(acts, act.number, -1) : null;
  const next = acts && act ? stepAct(acts, act.number, 1) : null;

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && prev && onNavigate) onNavigate(prev);
      else if (e.key === 'ArrowRight' && next && onNavigate) onNavigate(next);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, prev, next, onNavigate]);

  if (!isOpen || !act) return null;

  const actKey = showId ? `act-${showId}-${act.number}` : `act-${act.number}`;
  const isActFav = favorites?.has(actKey);
  const nameFn = (n) => displayName(n, canViewFullNames);

  // "In 5 acts, about 20 min" / "Finished" while the show is live.
  let liveLine = null;
  if (currentAct?.isTracking && acts) {
    const here = acts.findIndex(a => Number(a.number) === Number(act.number));
    const stage = acts.findIndex(a => Number(a.number) === Number(currentAct.number));
    const done = currentAct.phase === 'intermission' ? stage + 1 : stage;
    if (here >= 0 && stage >= 0 && !isCurrent) {
      if (here < done) liveLine = 'Finished';
      else {
        const away = here - stage;
        const eta = minutesAway(away, typicalActMs(actLog));
        liveLine = away === 1 ? 'Up next' : `In ${away} acts${eta ? `, ${eta}` : ''}`;
      }
    }
  }

  const handleShare = async () => {
    const names = user ? (act.performers?.map(nameFn).join(', ') || '') : '';
    const text = `Act ${act.number}: ${act.title}${names ? `\nDancers: ${names}` : ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Act ${act.number}`, text }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(text);
  };

  // Swipe left/right on the sheet to move through the running order.
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current == null || !onNavigate) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (dx > 60 && prev) onNavigate(prev);
    else if (dx < -60 && next) onNavigate(next);
  };

  const navBtn = "h-11 min-w-0 flex items-center gap-1 text-sm text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white disabled:opacity-0";

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-950/50" aria-hidden="true" />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Act ${act.number}, ${act.title}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative w-full sm:max-w-lg bg-white dark:bg-ink-800 rounded-t-2xl sm:rounded-card shadow-2xl max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="px-5 pt-2.5 pb-6 space-y-4">
          <span className="block mx-auto w-10 h-1.5 rounded-full bg-ink-200 dark:bg-ink-600 sm:hidden" aria-hidden="true" />

          {/* Previous / next / close */}
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => onNavigate?.(prev)} disabled={!prev || !onNavigate} aria-label={prev ? `Previous act, ${prev.number} ${prev.title}` : 'No previous act'} className={navBtn}>
              <ChevronLeft size={18} className="shrink-0" />
              {prev && <span className="truncate max-w-[8rem]">{prev.number} {prev.title}</span>}
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => onNavigate?.(next)} disabled={!next || !onNavigate} aria-label={next ? `Next act, ${next.number} ${next.title}` : 'No next act'} className={navBtn}>
                {next && <span className="truncate max-w-[8rem]">{next.number} {next.title}</span>}
                <ChevronRight size={18} className="shrink-0" />
              </button>
              <button ref={closeButtonRef} onClick={onClose} aria-label="Close" className="w-11 h-11 flex items-center justify-center rounded-card text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            {isCurrent && <p className="text-sm font-semibold text-stage-700 dark:text-stage-300 mb-1">On stage now</p>}
            <div className="flex items-baseline gap-3">
              <span className={clsx("font-display font-black text-5xl leading-none tabular-nums", isCurrent ? "text-stage-600 dark:text-stage-300" : "text-ink-900 dark:text-white")}>
                {act.number}
              </span>
              <h2 className="font-display italic text-2xl leading-tight dark:text-white">{act.title}</h2>
            </div>
            {liveLine && <p className="text-sm font-semibold text-ink-700 dark:text-ink-200 mt-2">{liveLine}</p>}
          </div>

          {/* Save + share */}
          <div className="flex gap-2.5">
            <button
              onClick={() => toggleFavorite(actKey)}
              aria-pressed={!!isActFav}
              className={clsx(
                "flex-1 h-12 flex items-center justify-center gap-2 rounded-card font-semibold text-sm transition-colors",
                isActFav ? "bg-brand-700 text-white hover:bg-brand-800" : "border border-ink-800 dark:border-ink-300 text-ink-900 dark:text-white hover:bg-ink-50 dark:hover:bg-ink-700"
              )}
            >
              <Star size={16} fill={isActFav ? 'currentColor' : 'none'} />
              {isActFav ? 'Saved' : 'Save this act'}
            </button>
            <button onClick={handleShare} aria-label="Share this act" className="w-12 h-12 flex items-center justify-center rounded-card border border-ink-300 dark:border-ink-600 text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-700">
              <Share2 size={18} />
            </button>
          </div>

          {/* Dancers */}
          {act.performers?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink-500 dark:text-ink-400 mb-2">
                {user ? `${act.performers.length} dancer${act.performers.length !== 1 ? 's' : ''}` : 'Dancers'}
              </h3>
              {!user ? (
                <Link to="/settings" onClick={onClose} className="flex items-center gap-3 p-4 rounded-card border border-dashed border-ink-300 dark:border-ink-600">
                  <Lock size={18} className="text-ink-500 shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold dark:text-white">Sign in to see dancer names</span>
                    <span className="block text-xs text-ink-500 dark:text-ink-400">Names are hidden to protect performers&rsquo; privacy.</span>
                  </span>
                </Link>
              ) : (
                <ul className="divide-y divide-ink-100 dark:divide-ink-700">
                  {act.performers.map((performer, i) => {
                    const following = favorites?.has(performer);
                    return (
                      <li key={`${performer}-${i}`} className="flex items-center justify-between gap-3 py-1.5">
                        <span className={clsx("text-[15px]", following ? "font-semibold text-brand-700 dark:text-brand-300" : "dark:text-white")}>
                          {nameFn(performer)}
                        </span>
                        <button
                          onClick={() => toggleFavorite(performer)}
                          aria-pressed={!!following}
                          aria-label={following ? `Stop following ${nameFn(performer)}` : `Follow ${nameFn(performer)}`}
                          className={clsx(
                            "h-9 px-3 rounded-card text-xs font-semibold shrink-0",
                            following ? "bg-brand-700 text-white" : "border border-ink-300 dark:border-ink-600 text-ink-700 dark:text-ink-200"
                          )}
                        >
                          {following ? 'Following' : 'Follow'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
