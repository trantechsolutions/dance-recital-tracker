import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export default function NavButton({ active, to, icon, label, badge }) {
  return (
    <Link
      to={to}
      className={clsx(
        "flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[52px] relative transition-colors",
        active ? "text-pink-600" : "text-slate-400"
      )}
    >
      {/* Active pill indicator */}
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-pink-600 rounded-b-full" />
      )}

      <div className={clsx(
        "relative flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200",
        active ? "bg-pink-50 dark:bg-pink-950/60" : ""
      )}>
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] bg-pink-600 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 leading-none shadow-sm">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>

      <span className={clsx(
        "text-[10px] font-bold leading-none",
        active ? "text-pink-600" : "text-slate-400"
      )}>
        {label}
      </span>
    </Link>
  );
}
