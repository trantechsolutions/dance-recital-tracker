import React from 'react';
import { clsx } from 'clsx';

export default function NavButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick} 
      className={clsx(
        "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200",
        active ? "text-pink-600" : "text-slate-400 hover:text-slate-500"
      )}
    >
      <div className={clsx(
        "p-1 rounded-lg transition-colors",
        active && "bg-pink-50 dark:bg-pink-900/20"
      )}>
        {React.cloneElement(icon, { 
          size: 22, 
          strokeWidth: active ? 2.5 : 2 
        })}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}