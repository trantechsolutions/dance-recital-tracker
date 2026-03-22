import React, { useState, useEffect } from 'react';
import { ArrowUp, Radio } from 'lucide-react';

export default function FloatingButtons({ currentAct }) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToCurrentAct = () => {
    const currentActEl = document.querySelector('[data-current-act="true"]');
    if (currentActEl) {
      currentActEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const isTracking = currentAct?.isTracking;

  return (
    <div className="fixed right-4 bottom-28 md:bottom-8 z-30 flex flex-col gap-3">
      {/* Scroll to current act (only when tracking) */}
      {isTracking && (
        <button
          onClick={scrollToCurrentAct}
          className="w-12 h-12 bg-pink-600 text-white rounded-full shadow-lg shadow-pink-500/30 flex items-center justify-center hover:bg-pink-700 active:scale-90 transition-all animate-in slide-in-from-right duration-300"
          title="Jump to current act"
        >
          <Radio size={20} className="animate-pulse" />
        </button>
      )}

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="w-12 h-12 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-90 transition-all animate-in slide-in-from-right duration-300"
          title="Back to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
