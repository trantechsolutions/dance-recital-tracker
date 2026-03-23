import React from 'react';
import { X, Star, Heart, Share2, Music } from 'lucide-react';
import { clsx } from 'clsx';

export default function ActDetailModal({ act, isOpen, onClose, favorites, toggleFavorite, isCurrent }) {
  if (!isOpen || !act) return null;

  const isActFav = favorites?.has(`act-${act.number}`);

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
        className="relative w-full sm:max-w-lg bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={clsx(
          "relative p-6 sm:p-8 pb-8 sm:pb-12 text-center overflow-hidden",
          isCurrent
            ? "bg-gradient-to-br from-pink-600 to-rose-700 text-white"
            : "bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/20"
        )}>
          <Music size={80} className={clsx(
            "absolute -right-3 -bottom-3 rotate-12",
            isCurrent ? "text-white/10" : "text-pink-200/50 dark:text-pink-800/20"
          )} />

          <button
            onClick={onClose}
            className={clsx(
              "absolute top-3 right-3 p-2 rounded-xl transition-colors",
              isCurrent ? "text-white/70 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            <X size={20} />
          </button>

          {isCurrent && (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-2">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-[9px] uppercase tracking-[0.15em] font-black">Now Performing</span>
            </div>
          )}

          <div className={clsx("text-5xl font-black mb-1 tracking-tighter", isCurrent ? "text-white" : "text-pink-600")}>
            #{act.number}
          </div>
          <h2 className={clsx("text-xl font-black leading-tight", isCurrent ? "text-white" : "text-slate-900 dark:text-white")}>
            {act.title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex gap-2.5">
            <button
              onClick={() => toggleFavorite(`act-${act.number}`)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
                isActFav
                  ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600"
              )}
            >
              <Star size={16} fill={isActFav ? "currentColor" : "none"} />
              {isActFav ? 'Favorited' : 'Favorite'}
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Share2 size={16} />
            </button>
          </div>

          {act.performers?.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-0.5">
                Performers ({act.performers.length})
              </h3>
              <div className="space-y-1.5">
                {act.performers.map((performer, i) => {
                  const isDancerFav = favorites?.has(performer);
                  return (
                    <div
                      key={i}
                      className={clsx(
                        "flex items-center justify-between p-3 rounded-xl transition-colors",
                        isDancerFav
                          ? "bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-900/30"
                          : "bg-slate-50 dark:bg-slate-900 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={clsx(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0",
                          isDancerFav
                            ? "bg-pink-100 dark:bg-pink-900/40 text-pink-600"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                          {performer.charAt(0).toUpperCase()}
                        </div>
                        <span className={clsx(
                          "font-bold text-sm",
                          isDancerFav ? "text-pink-600 dark:text-pink-400" : "dark:text-white"
                        )}>
                          {performer}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleFavorite(performer)}
                        className={clsx(
                          "p-1.5 rounded-lg transition-colors",
                          isDancerFav ? "text-pink-600" : "text-slate-300 hover:text-pink-500"
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
