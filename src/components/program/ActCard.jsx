import React from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';

export default function ActCard({ act, isFav, isCurrent }) {
  return (
    <div className={clsx(
      "p-4 rounded-xl border transition-all duration-300",
      isCurrent 
        ? "bg-pink-50 dark:bg-pink-900/20 border-pink-500 ring-1 ring-pink-500 scale-[1.02]" 
        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
      isFav && !isCurrent && "border-l-4 border-l-pink-600"
    )}>
      <div className="flex justify-between items-start gap-4">
        <div className="font-bold text-lg dark:text-white leading-tight">
          <span className="text-pink-600 mr-2">#{act.number}</span>
          {act.title}
        </div>
        {isFav && <Star size={18} className="text-pink-600 fill-pink-600 shrink-0 mt-1" />}
      </div>
      
      {act.performers?.length > 0 && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold">Performers:</span> {act.performers.join(', ')}
        </p>
      )}
    </div>
  );
}