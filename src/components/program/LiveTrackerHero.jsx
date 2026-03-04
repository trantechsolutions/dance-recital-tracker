import React from 'react';
import { Minus, Plus, Radio } from 'lucide-react';
import { clsx } from 'clsx';

export default function LiveTrackerHero({ currentAct, isAuthorized, onUpdate, onToggle }) {
  if (!currentAct.isTracking && !isAuthorized) return null;

  return (
    <div className="mb-8">
      {isAuthorized && (
        <button 
          onClick={onToggle}
          className={clsx(
            "w-full py-3 mb-4 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2",
            currentAct.isTracking ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
          )}
        >
          <Radio size={18} className={currentAct.isTracking ? "animate-pulse" : ""} />
          {currentAct.isTracking ? 'Stop Live Tracking' : 'Start Live Tracking'}
        </button>
      )}

      {currentAct.isTracking && (
        <div className="bg-pink-600 p-8 rounded-2xl text-white shadow-xl shadow-pink-500/20 text-center animate-in fade-in zoom-in duration-500">
          <h2 className="text-xs uppercase tracking-[0.2em] font-black opacity-70 mb-2">Now Performing</h2>
          <div className="text-7xl font-black mb-2 tracking-tighter">#{currentAct.number}</div>
          <div className="text-xl font-bold opacity-90 mb-6">{currentAct.title}</div>
          
          {isAuthorized && (
            <div className="flex justify-center gap-6">
              <button 
                onClick={() => onUpdate(currentAct.number - 1)} 
                className="w-14 h-14 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-colors shadow-inner"
              >
                <Minus size={28} strokeWidth={3} />
              </button>
              <button 
                onClick={() => onUpdate(currentAct.number + 1)} 
                className="w-14 h-14 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-colors shadow-inner"
              >
                <Plus size={28} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}