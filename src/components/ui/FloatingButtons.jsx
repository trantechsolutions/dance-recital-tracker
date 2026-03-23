import React, { useState, useEffect } from 'react';
import { ArrowUp, Radio } from 'lucide-react';

export default function FloatingButtons({ currentAct }) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const scrollToCurrentAct = () => {
    const el = document.querySelector('[data-current-act="true"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="fixed right-3 bottom-20 md:bottom-6 z-30 flex flex-col gap-2">
      {currentAct?.isTracking && (
        <button
          onClick={scrollToCurrentAct}
          className="w-11 h-11 bg-pink-600 text-white rounded-full shadow-lg shadow-pink-500/30 flex items-center justify-center hover:bg-pink-700 active:scale-90 transition-all"
          title="Jump to current act"
        >
          <Radio size={18} className="animate-pulse" />
        </button>
      )}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="w-11 h-11 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-90 transition-all"
          title="Back to top"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}
