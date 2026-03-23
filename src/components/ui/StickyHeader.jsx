import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function StickyHeader({ currentAct, isAuthorized, onUpdate }) {
  if (!currentAct.isTracking) return null;

  return (
    <div className="fixed top-0 left-0 right-0 md:left-72 z-50 bg-pink-600 text-white px-3 py-2.5 shadow-lg flex justify-between items-center">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="font-bold text-sm whitespace-nowrap">Now:</span>
        <span className="bg-white text-pink-600 px-1.5 py-0.5 rounded font-mono font-bold text-sm">
          #{currentAct.number}
        </span>
        <span className="truncate text-sm font-medium">{currentAct.title}</span>
      </div>

      {isAuthorized && (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => onUpdate(currentAct.number - 1)}
            className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <Minus size={14}/>
          </button>
          <button
            onClick={() => onUpdate(currentAct.number + 1)}
            className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <Plus size={14}/>
          </button>
        </div>
      )}
    </div>
  );
}
