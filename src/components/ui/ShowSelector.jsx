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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLabel = selectedShow && recitalData?.[selectedShow]
    ? recitalData[selectedShow].label
    : 'Choose a Performance...';

  const showCount = recitalData ? Object.keys(recitalData).length : 0;

  return (
    <div className="mb-5 sm:mb-6 relative z-40" ref={dropdownRef}>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={clsx(
          "w-full bg-white dark:bg-ink-800 rounded-card shadow-sm border flex items-center gap-3.5 cursor-pointer transition-all duration-200 text-left",
          "px-4 py-3.5",
          isOpen
            ? "border-brand-500 ring-2 ring-brand-500/15 shadow-md"
            : "border-ink-200 dark:border-ink-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md"
        )}
      >
        <div className={clsx(
          "shrink-0 w-10 h-10 rounded-card flex items-center justify-center transition-colors",
          isOpen
            ? "bg-brand-600 text-white shadow-sm"
            : "bg-brand-50 dark:bg-brand-900/20 text-brand-600"
        )}>
          <Calendar size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold uppercase text-ink-400 tracking-widest mb-0.5">Performance</p>
          <p className={clsx(
            "font-bold text-[15px] truncate transition-colors",
            !selectedShow ? "text-ink-400" : "text-ink-900 dark:text-white"
          )}>
            {currentLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showCount > 1 && (
            <span className="hidden sm:flex text-[10px] font-semibold text-ink-400 bg-ink-100 dark:bg-ink-700 px-2 py-0.5 rounded-full">
              {showCount}
            </span>
          )}
          <ChevronDown
            size={18}
            className={clsx(
              "text-ink-400 transition-transform duration-200",
              isOpen && "rotate-180 text-brand-500"
            )}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-[60]"
        >
          <div className="p-2 max-h-[calc(55vh-64px)] sm:max-h-[55vh] overflow-y-auto hide-scrollbar">
            {recitalData && Object.keys(recitalData).length > 0 ? (
              Object.keys(recitalData).map(k => (
                <button
                  key={k}
                  role="option"
                  aria-selected={selectedShow === k}
                  onClick={() => { setSelectedShow(k); setIsOpen(false); }}
                  className={clsx(
                    "w-full text-left flex items-center justify-between px-4 py-3.5 rounded-card font-bold transition-all duration-150 text-sm",
                    selectedShow === k
                      ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400"
                      : "text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-700/50"
                  )}
                >
                  <span className="truncate pr-3">{recitalData[k].label}</span>
                  {selectedShow === k && <Check size={16} className="shrink-0 text-brand-600" />}
                </button>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-ink-400 font-bold">
                No performances scheduled yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
