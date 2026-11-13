import React, { useState } from 'react';
import { getDimDuringShow, setDimDuringShow } from '../../utils/theme';

const SEEN_KEY = 'dimPromptSeen_v1';
const seen = () => { try { return !!localStorage.getItem(SEEN_KEY); } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /* private mode */ } };

// Asked once, the first time a parent is in the app while a show is live:
// "Dim the screen?" Easier than finding the setting, and kinder to the row
// behind them. The answer is remembered; Settings can change it later.
export default function DimPrompt({ live }) {
  const [open, setOpen] = useState(() => !seen() && !getDimDuringShow());
  if (!live || !open) return null;

  const answer = (dim) => {
    if (dim) setDimDuringShow(true);
    markSeen();
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Dim the screen during the show?"
      className="fixed inset-x-2 md:left-[calc(16rem+1rem)] md:right-4 z-40 bottom-[calc(140px+env(safe-area-inset-bottom,0px))] md:bottom-24 print:hidden"
    >
      <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-3 px-4 py-3 rounded-card bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 shadow-xl">
        <p className="flex-1 min-w-[12rem] text-sm text-ink-800 dark:text-ink-100">
          <span className="font-semibold">The show has started.</span> Dim the screen so it&rsquo;s easier on the people around you?
        </p>
        <div className="flex gap-2">
          <button onClick={() => answer(false)} className="h-10 px-3 rounded-card text-sm text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700">No thanks</button>
          <button onClick={() => answer(true)} className="h-10 px-4 rounded-card bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-semibold">Dim the screen</button>
        </div>
      </div>
    </div>
  );
}
