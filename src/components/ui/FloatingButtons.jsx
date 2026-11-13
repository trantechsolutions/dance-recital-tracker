import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { clsx } from 'clsx';

// Back-to-top only. "Jump to the act on stage" lives in the docked LiveBar.
export default function FloatingButtons({ liftAboveLiveBar = false }) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!showBackToTop) return null;

  return (
    <div className={clsx(
      "fixed right-4 z-30 print:hidden",
      liftAboveLiveBar ? "bottom-[calc(140px+env(safe-area-inset-bottom,0px))] md:bottom-28" : "bottom-24 md:bottom-8"
    )}>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className="w-12 h-12 bg-white dark:bg-ink-800 text-ink-500 dark:text-ink-400 rounded-card shadow-xl border border-ink-100 dark:border-ink-700 flex items-center justify-center hover:bg-ink-50 dark:hover:bg-ink-700 active:scale-90 transition-all"
      >
        <ArrowUp size={20} />
      </button>
    </div>
  );
}
