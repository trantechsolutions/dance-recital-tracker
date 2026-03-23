import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

export default function ShowSelector({ recitalData, selectedShow, setSelectedShow }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = selectedShow && recitalData?.[selectedShow]
    ? recitalData[selectedShow].label
    : 'Choose Performance...';

  return (
    <div className="mb-4 sm:mb-6 max-w-md mx-auto md:mx-0 relative z-40" ref={dropdownRef}>

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "bg-white dark:bg-slate-800 p-3 rounded-xl sm:rounded-2xl shadow-sm border flex items-center gap-3 cursor-pointer transition-all duration-200 group",
          isOpen
            ? "border-pink-500 ring-2 ring-pink-500/10"
            : "border-slate-100 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-700"
        )}
      >
        <div className={clsx(
          "shrink-0 p-2.5 rounded-lg sm:rounded-xl transition-colors",
          isOpen
            ? "bg-pink-600 text-white shadow-sm"
            : "bg-pink-50 dark:bg-pink-900/20 text-pink-600"
        )}>
          <Calendar size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5 tracking-widest cursor-pointer">
            Performance
          </label>
          <div className="flex justify-between items-center">
            <span className={clsx(
              "font-bold text-sm truncate pr-2 transition-colors",
              !selectedShow ? "text-slate-400" : "text-slate-900 dark:text-white"
            )}>
              {currentLabel}
            </span>
            <ChevronDown size={16} className={clsx(
              "shrink-0 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180 text-pink-500"
            )} />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-1.5 max-h-[50vh] overflow-y-auto hide-scrollbar">
            {recitalData && Object.keys(recitalData).length > 0 ? (
              Object.keys(recitalData).map(k => (
                <button
                  key={k}
                  onClick={() => { setSelectedShow(k); setIsOpen(false); }}
                  className={clsx(
                    "w-full text-left flex items-center justify-between p-3 rounded-lg sm:rounded-xl font-bold transition-all duration-150 text-sm",
                    selectedShow === k
                      ? "bg-pink-50 dark:bg-pink-900/20 text-pink-600"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <span className="truncate pr-3">{recitalData[k].label}</span>
                  {selectedShow === k && <Check size={16} className="shrink-0" />}
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-slate-400 font-bold">
                No performances scheduled yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
