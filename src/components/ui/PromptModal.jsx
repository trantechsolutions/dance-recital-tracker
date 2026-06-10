import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function PromptModal({
  isOpen,
  title,
  message,
  placeholder = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(value);
    setValue('');
  };

  const handleCancel = () => {
    onCancel();
    setValue('');
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
      onClick={handleCancel}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm bg-white dark:bg-ink-800 rounded-card shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 p-2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 transition-colors rounded-card"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-card flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-600" />
          </div>

          <div>
            <h2 className="text-xl font-semibold dark:text-white mb-1">{title}</h2>
            {message && (
              <p className="text-ink-500 dark:text-ink-400 text-sm leading-relaxed">{message}</p>
            )}
          </div>

          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') handleCancel(); }}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-ink-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded-card text-ink-800 dark:text-white text-sm font-medium placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
          />

          <div className="w-full space-y-2.5">
            <button
              onClick={handleConfirm}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-card font-bold text-sm shadow-md shadow-red-500/20 transition-all active:scale-95"
            >
              {confirmLabel}
            </button>
            <button
              onClick={handleCancel}
              className="w-full px-5 py-3 text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 font-bold text-sm transition-colors"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
