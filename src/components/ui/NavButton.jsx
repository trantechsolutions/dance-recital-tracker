import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export default function NavButton({ active, to, icon, label, badge }) {
  return (
    <Link
      to={to}
      className={clsx(
        "flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 py-1.5 rounded-xl transition-colors relative",
        active
          ? "text-pink-600"
          : "text-slate-400 active:text-slate-600"
      )}
    >
      <div className="relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] bg-pink-600 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={clsx(
        "text-[9px] font-bold leading-none truncate max-w-full",
        active ? "text-pink-600" : "text-slate-400"
      )}>
        {label}
      </span>
    </Link>
  );
}
