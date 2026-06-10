import { AlertTriangle, Info, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';

const VARIANTS = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600',
    confirmBtn: 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600',
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-brand-100 dark:bg-brand-900/30',
    iconColor: 'text-brand-600',
    confirmBtn: 'bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 text-white',
  },
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const { icon: Icon, iconBg, iconColor, confirmBtn } = VARIANTS[variant] ?? VARIANTS.info;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm bg-white dark:bg-ink-800 rounded-card shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 transition-colors rounded-card"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className={clsx('w-14 h-14 rounded-card flex items-center justify-center', iconBg)}>
            <Icon size={28} className={iconColor} />
          </div>

          <div>
            <h2 className="text-xl font-semibold dark:text-white mb-1">{title}</h2>
            {message && (
              <p className="text-ink-500 dark:text-ink-400 text-sm leading-relaxed">{message}</p>
            )}
          </div>

          <div className="w-full space-y-2.5 pt-1">
            <button
              onClick={onConfirm}
              className={clsx(
                'w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-card font-bold text-sm transition-all active:scale-95',
                confirmBtn
              )}
            >
              {confirmLabel}
            </button>
            <button
              onClick={onCancel}
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
