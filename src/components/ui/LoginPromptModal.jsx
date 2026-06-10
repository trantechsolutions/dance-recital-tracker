import React from 'react';
import { Heart, X, LogIn } from 'lucide-react';

export default function LoginPromptModal({ isOpen, onClose, onGoToSettings }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm bg-white dark:bg-ink-800 rounded-card shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 transition-colors rounded-card"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/30 rounded-card flex items-center justify-center">
            <Heart size={28} className="text-brand-600" fill="currentColor" />
          </div>

          <div>
            <h2 className="text-xl font-semibold dark:text-white mb-1">Sign in to save favorites</h2>
            <p className="text-ink-500 dark:text-ink-400 text-sm leading-relaxed">
              Create a free account to save your favorite acts and dancers across devices.
            </p>
          </div>

          <div className="w-full space-y-2.5 pt-1">
            <button
              onClick={onGoToSettings}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-card font-bold text-sm shadow-lg shadow-brand-500/20 transition-all"
            >
              <LogIn size={16} /> Sign In or Create Account
            </button>
            <button
              onClick={onClose}
              className="w-full px-5 py-3 text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 font-bold text-sm transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
