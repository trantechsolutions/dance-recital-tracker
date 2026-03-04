import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

export default function ShowSelector({ recitalData, selectedShow, setSelectedShow }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside of it
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
    <div className="mb-6 max-w-md mx-auto md:mx-0 relative z-40" ref={dropdownRef}>
      
      {/* --- TRIGGER BUTTON --- */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-3xl shadow-sm border flex items-center gap-3 sm:gap-4 cursor-pointer transition-all duration-300 group",
          isOpen 
            ? "border-pink-500 ring-4 ring-pink-500/10" 
            : "border-slate-100 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-md"
        )}
      >
        <div className={clsx(
          "shrink-0 p-3 rounded-xl transition-colors duration-300",
          isOpen 
            ? "bg-pink-600 text-white shadow-md shadow-pink-500/30" 
            : "bg-pink-50 dark:bg-pink-900/20 text-pink-600 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/40"
        )}>
          <Calendar size={20} />
        </div>
        
        <div className="flex-1">
          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5 ml-1 tracking-widest cursor-pointer">
            Select Performance
          </label>
          <div className="flex justify-between items-center pr-2">
            <span className={clsx("font-bold text-sm sm:text-base truncate pr-4 transition-colors", !selectedShow ? "text-slate-400" : "text-slate-900 dark:text-white")}>
              {currentLabel}
            </span>
            <ChevronDown size={18} className={clsx("shrink-0 text-slate-400 transition-transform duration-300", isOpen && "rotate-180 text-pink-500")} />
          </div>
        </div>
      </div>

      {/* --- DROPDOWN MENU --- */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top">
          <div className="p-2 max-h-[50vh] overflow-y-auto hide-scrollbar">
            {recitalData && Object.keys(recitalData).length > 0 ? (
              Object.keys(recitalData).map(k => (
                <button
                  key={k}
                  onClick={() => {
                    setSelectedShow(k);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "w-full text-left flex items-center justify-between p-3 sm:p-4 rounded-2xl font-bold transition-all duration-200",
                    selectedShow === k 
                      ? "bg-pink-50 dark:bg-pink-900/20 text-pink-600" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:pl-5"
                  )}
                >
                  <span className="text-sm truncate pr-4">{recitalData[k].label}</span>
                  {selectedShow === k && <Check size={18} className="shrink-0" />}
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