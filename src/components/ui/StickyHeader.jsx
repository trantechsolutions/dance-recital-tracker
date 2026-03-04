import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { clsx } from 'clsx';

export default function StickyHeader({ currentAct, isAuthorized, onUpdate }) {
  // Only show if tracking is active
  if (!currentAct.isTracking) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-pink-600 text-white p-3 shadow-lg flex justify-between items-center transition-transform duration-300">
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="font-bold whitespace-nowrap">Now:</span>
        <span className="bg-white text-pink-600 px-2 py-0.5 rounded font-mono font-bold">
          #{currentAct.number}
        </span>
        <span className="truncate font-medium">{currentAct.title}</span>
      </div>
      
      {isAuthorized && (
        <div className="flex gap-2">
          <button 
            onClick={() => onUpdate(currentAct.number - 1)}
            className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <Minus size={16}/>
          </button>
          <button 
            onClick={() => onUpdate(currentAct.number + 1)}
            className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <Plus size={16}/>
          </button>
        </div>
      )}
    </div>
  );
}