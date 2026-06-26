import React from 'react';
import { CloudUpload, X, Check } from 'lucide-react';

// Shown on login when the device has favorites/notes saved while logged out.
// Lets the user merge that local data into their account, or keep it on the
// device only (e.g. on a shared/family device).
export default function SyncPromptModal({ isOpen, counts, onSync, onKeepSeparate }) {
  if (!isOpen) return null;

  const fav = counts?.favorites || 0;
  const notes = counts?.notes || 0;
  const parts = [];
  if (fav) parts.push(`${fav} favorite${fav === 1 ? '' : 's'}`);
  if (notes) parts.push(`${notes} note${notes === 1 ? '' : 's'}`);
  const summary = parts.join(' and ');

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop — no click-to-dismiss; force an explicit choice */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-white dark:bg-ink-800 rounded-card shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={onKeepSeparate}
          className="absolute top-4 right-4 p-2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 transition-colors rounded-card"
          aria-label="Keep on this device only"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/30 rounded-card flex items-center justify-center">
            <CloudUpload size={28} className="text-brand-600" />
          </div>

          <div>
            <h2 className="text-xl font-semibold dark:text-white mb-1">Sync to your account?</h2>
            <p className="text-ink-500 dark:text-ink-400 text-sm leading-relaxed">
              You have {summary || 'saved items'} saved on this device. Add them to your
              account so they're available everywhere?
            </p>
          </div>

          <div className="w-full space-y-2.5 pt-1">
            <button
              onClick={onSync}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-card font-bold text-sm shadow-lg shadow-brand-500/20 transition-all"
            >
              <Check size={16} /> Sync to my account
            </button>
            <button
              onClick={onKeepSeparate}
              className="w-full px-5 py-3 text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 font-bold text-sm transition-colors"
            >
              Keep on this device only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
