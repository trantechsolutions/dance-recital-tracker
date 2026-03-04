import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export default function NavButton({ active, to, icon, label }) {
  return (
    <Link 
      to={to}
      className={clsx(
        "flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300",
        active 
          ? "text-pink-600 bg-pink-50 dark:bg-pink-900/20 -translate-y-2 shadow-lg shadow-pink-500/20" 
          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      )}
    >
      <div className={clsx("mb-1 transition-transform duration-300", active && "scale-110")}>
        {icon}
      </div>
      <span className={clsx("text-[9px] font-black tracking-wider transition-all duration-300", active ? "opacity-100" : "opacity-0 h-0")}>
        {label}
      </span>
    </Link>
  );
}