
import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export default function SidebarLink({ active, to, icon, label }) {
  return (
    <Link 
      to={to}
      className={clsx(
        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm",
        active 
          ? "bg-pink-600 text-white shadow-xl shadow-pink-500/20 translate-x-1" 
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
