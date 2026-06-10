import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export default function NavButton({ active, to, icon, label, badge }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        "flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[56px] relative transition-colors",
        active ? "text-brand-700 dark:text-brand-400" : "text-ink-400 dark:text-ink-500"
      )}
    >
      {/* Active marker */}
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-brand-600 rounded-b-full" />
      )}

      <div className={clsx(
        "relative flex items-center justify-center w-11 h-8 rounded-card transition-colors duration-200",
        active ? "bg-brand-50 dark:bg-brand-950/60" : ""
      )}>
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-brand-600 text-white text-[10px] font-semibold rounded-pill flex items-center justify-center px-1 leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>

      <span className={clsx(
        "text-[11px] font-semibold leading-none",
        active ? "text-brand-700 dark:text-brand-400" : "text-ink-500 dark:text-ink-400"
      )}>
        {label}
      </span>
    </Link>
  );
}
