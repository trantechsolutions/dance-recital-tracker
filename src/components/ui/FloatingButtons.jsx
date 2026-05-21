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
          className="w-12 h-12 bg-brand-600 text-white rounded-card shadow-xl shadow-brand-500/30 flex items-center justify-center hover:bg-brand-700 active:scale-90 transition-all"
        >
          <Radio size={20} className="animate-pulse" />
        </button>
      )}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="w-12 h-12 bg-white dark:bg-ink-800 text-ink-500 dark:text-ink-400 rounded-card shadow-xl border border-ink-100 dark:border-ink-700 flex items-center justify-center hover:bg-ink-50 dark:hover:bg-ink-700 active:scale-90 transition-all"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
