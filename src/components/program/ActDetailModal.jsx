import React, { useEffect, useRef } from 'react';
import { X, Star, Heart, Share2, Music } from 'lucide-react';
import { clsx } from 'clsx';

export default function ActDetailModal({ act, isOpen, onClose, favorites, toggleFavorite, isCurrent, showId }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !act) return null;

  const actKey = showId ? `act-${showId}-${act.number}` : `act-${act.number}`;
  const isActFav = favorites?.has(actKey);

  const handleShare = async () => {
    const text = `Act #${act.number}: ${act.title}\nPerformers: ${act.performers?.join(', ') || 'N/A'}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Act #${act.number}`, text }); return; }
      catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg bg-white dark:bg-ink-800 rounded-t-2xl sm:rounded-card shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={clsx(
          "relative p-6 sm:p-8 pb-8 sm:pb-12 text-center overflow-hidden",
          isCurrent
            ? "bg-gradient-to-br from-brand-600 to-brand-700 text-white"
            : "bg-gradient-to-br from-brand-50 to-brand-50 dark:from-brand-900/30 dark:to-brand-900/20"
        )}>
          <Music size={80} className={clsx(
            "absolute -right-3 -bottom-3 rotate-12",
            isCurrent ? "text-white/10" : "text-brand-200/50 dark:text-brand-800/20"
          )} />

          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className={clsx(
              "absolute top-3 right-3 p-2 rounded-card transition-colors",
              isCurrent ? "text-white/70 hover:text-white hover:bg-white/10" : "text-ink-400 hover:text-ink-600 hover:bg-ink-100 dark:hover:bg-ink-700"
            )}
          >
            <X size={20} />
          </button>

          {isCurrent && (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-2">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-[9px] uppercase tracking-[0.15em] font-semibold">Now Performing</span>
            </div>
          )}

          <div className={clsx("text-5xl font-semibold mb-1 tracking-tighter", isCurrent ? "text-white" : "text-brand-600")}>
            #{act.number}
          </div>
          <h2 className={clsx("text-xl font-semibold leading-tight", isCurrent ? "text-white" : "text-ink-900 dark:text-white")}>
            {act.title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex gap-2.5">
            <button
              onClick={() => toggleFavorite(actKey)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-card font-bold text-sm transition-all active:scale-95",
                isActFav
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                  : "bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600"
              )}
            >
              <Star size={16} fill={isActFav ? "currentColor" : "none"} />
              {isActFav ? 'Favorited' : 'Favorite'}
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-3 bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 rounded-card hover:bg-ink-200 dark:hover:bg-ink-600 transition-colors"
            >
              <Share2 size={16} />
            </button>
          </div>

          {act.performers?.length > 0 && (
            <div>
              <h3 className="text-[10px] font-semibold uppercase text-ink-400 tracking-widest mb-2 px-0.5">
                Performers ({act.performers.length})
              </h3>
              <div className="space-y-1.5">
                {act.performers.map((performer, i) => {
                  const isDancerFav = favorites?.has(performer);
                  return (
                    <div
                      key={i}
                      className={clsx(
                        "flex items-center justify-between p-3 rounded-card transition-colors",
                        isDancerFav
                          ? "bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/30"
                          : "bg-ink-50 dark:bg-ink-900 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={clsx(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0",
                          isDancerFav
                            ? "bg-brand-100 dark:bg-brand-900/40 text-brand-600"
                            : "bg-ink-100 dark:bg-ink-800 text-ink-400"
                        )}>
                          {performer.charAt(0).toUpperCase()}
                        </div>
                        <span className={clsx(
                          "font-bold text-sm",
                          isDancerFav ? "text-brand-600 dark:text-brand-400" : "dark:text-white"
                        )}>
                          {performer}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleFavorite(performer)}
                        className={clsx(
                          "p-1.5 rounded-lg transition-colors",
                          isDancerFav ? "text-brand-600" : "text-ink-300 hover:text-brand-500"
                        )}
                      >
                        <Heart size={14} fill={isDancerFav ? "currentColor" : "none"} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 sm:hidden" />
      </div>
    </div>
  );
}
