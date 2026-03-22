import React from 'react';
import { X, Star, Heart, Share2, Music } from 'lucide-react';
import { clsx } from 'clsx';

export default function ActDetailModal({ act, isOpen, onClose, favorites, toggleFavorite, isCurrent }) {
  if (!isOpen || !act) return null;

  const isActFav = favorites?.has(`act-${act.number}`);

  const handleShare = async () => {
    const text = `Act #${act.number}: ${act.title}\nPerformers: ${act.performers?.join(', ') || 'N/A'}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Act #${act.number}`, text });
        return;
      } catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-lg bg-white dark:bg-slate-800 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className={clsx(
          "relative p-8 pb-12 text-center overflow-hidden",
          isCurrent
            ? "bg-gradient-to-br from-pink-600 to-rose-700 text-white"
            : "bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/20"
        )}>
          <Music size={100} className={clsx(
            "absolute -right-4 -bottom-4 rotate-12",
            isCurrent ? "text-white/10" : "text-pink-200/50 dark:text-pink-800/20"
          )} />

          <button
            onClick={onClose}
            className={clsx(
              "absolute top-4 right-4 p-2.5 rounded-xl transition-colors",
              isCurrent ? "text-white/70 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            <X size={20} />
          </button>

          {isCurrent && (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-[9px] uppercase tracking-[0.15em] font-black">Now Performing</span>
            </div>
          )}

          <div className={clsx(
            "text-6xl font-black mb-2 tracking-tighter",
            isCurrent ? "text-white" : "text-pink-600"
          )}>
            #{act.number}
          </div>
          <h2 className={clsx(
            "text-2xl font-black leading-tight",
            isCurrent ? "text-white" : "text-slate-900 dark:text-white"
          )}>
            {act.title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => toggleFavorite(`act-${act.number}`)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95",
                isActFav
                  ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600"
              )}
            >
              <Star size={18} fill={isActFav ? "currentColor" : "none"} />
              {isActFav ? 'Favorited' : 'Favorite Act'}
            </button>
            <button
              onClick={handleShare}
              className="px-5 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>

          {/* Performers */}
          {act.performers?.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 px-1">
                Performers ({act.performers.length})
              </h3>
              <div className="space-y-2">
                {act.performers.map((performer, i) => {
                  const isDancerFav = favorites?.has(performer);
                  return (
                    <div
                      key={i}
                      className={clsx(
                        "flex items-center justify-between p-3.5 rounded-xl transition-colors",
                        isDancerFav
                          ? "bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-900/30"
                          : "bg-slate-50 dark:bg-slate-900 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0",
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
                          "p-2 rounded-lg transition-colors",
                          isDancerFav
                            ? "text-pink-600"
                            : "text-slate-300 hover:text-pink-500"
                        )}
                      >
                        <Heart size={16} fill={isDancerFav ? "currentColor" : "none"} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom safe area for mobile */}
        <div className="h-6 sm:hidden" />
      </div>
    </div>
  );
}
