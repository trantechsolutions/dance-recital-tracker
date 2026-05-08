import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export default function SidebarLink({ active, to, icon, label, badge }) {
  return (
    <Link
      to={to}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm relative",
        active
          ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className={clsx(
          "min-w-[22px] h-[22px] text-[10px] font-black rounded-full flex items-center justify-center px-1.5",
          active
            ? "bg-white/20 text-white"
            : "bg-pink-100 dark:bg-pink-900/30 text-pink-600"
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
