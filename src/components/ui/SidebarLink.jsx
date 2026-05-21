import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export default function SidebarLink({ active, to, icon, label, badge }) {
  return (
    <Link
      to={to}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-card transition-colors duration-200 font-semibold text-sm relative",
        active
          ? "bg-brand-600 text-white"
          : "text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-900 dark:hover:text-white"
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className={clsx(
          "min-w-[22px] h-[22px] text-[11px] font-semibold rounded-pill flex items-center justify-center px-1.5",
          active
            ? "bg-white/20 text-white"
            : "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
