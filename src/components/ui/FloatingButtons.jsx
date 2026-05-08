import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp, Radio } from 'lucide-react';

export default function FloatingButtons({ currentAct }) {
  const location = useLocation();
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

  // Jump-to-live only makes sense on the Program view where act cards are rendered
  const isOnProgramRoute = location.pathname === '/';
  const showLiveJump = currentAct?.isTracking && isOnProgramRoute;

  const hasButtons = showLiveJump || showBackToTop;
  if (!hasButtons) return null;

  return (
    <div className="fixed right-4 bottom-24 md:bottom-8 z-30 flex flex-col gap-2.5">
      {showLiveJump && (
        <button
          onClick={scrollToCurrentAct}
          aria-label="Jump to current act"
          className="w-12 h-12 bg-pink-600 text-white rounded-2xl shadow-xl shadow-pink-500/30 flex items-center justify-center hover:bg-pink-700 active:scale-90 transition-all"
        >
          <Radio size={20} className="animate-pulse" />
        </button>
      )}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="w-12 h-12 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-90 transition-all"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
