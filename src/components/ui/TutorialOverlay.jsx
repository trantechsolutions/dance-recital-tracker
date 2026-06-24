import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, List, Search, Heart, Settings, ShieldAlert,
  Calendar, Radio, Users, Wrench,
  X, ChevronLeft, ChevronRight, Check, PartyPopper,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '../../context/AppContext';
import { MULTI_STUDIO_ENABLED } from '../../config';

// The user-facing tour: what each top-level menu does. Intentionally excludes
// the admin console — normal users never see it, and admins get a dedicated
// tour from the admin panel's (?) button.
function buildGeneralSteps() {
  return [
    {
      key: 'welcome',
      icon: Sparkles,
      tint: 'brand',
      title: 'Welcome! 👋',
      blurb: "Here's a 30-second tour of the recital app and what each menu does.",
      points: [
        'Browse the full program and follow the show live',
        'Star your favorite acts and dancers',
        'Build a personal schedule with private notes',
      ],
    },
    {
      key: 'program',
      icon: List,
      tint: 'brand',
      title: 'Program',
      blurb: 'The full running order of the recital.',
      points: [
        'See every act in order, with its performers',
        'Follow along live — the current act highlights in real time while the show runs',
        'Tap the heart on any act or dancer to save it',
        'Jump straight to the act performing now',
      ],
    },
    {
      key: 'search',
      icon: Search,
      tint: 'sky',
      title: 'Search',
      blurb: 'Find any act or dancer in seconds.',
      points: [
        'Search acts by title, number, or performer',
        'Switch to the Dancers tab to look someone up by name',
        'See every act a dancer appears in',
        'Favorite results without leaving the search',
      ],
    },
    {
      key: 'schedule',
      icon: Heart,
      tint: 'rose',
      title: 'My Schedule',
      blurb: 'Your personalized lineup of everything you starred.',
      points: [
        'A timeline of just the acts and dancers you favorited',
        'Shows what’s on now and what’s up next during a live show',
        'Add a private note to each dancer per dance — outfit, hairstyle, props',
        'Only you can see your notes (sign in to sync them across devices)',
      ],
    },
    {
      key: 'settings',
      icon: Settings,
      tint: 'ink',
      title: 'Settings',
      blurb: 'Your account and preferences.',
      points: [
        'Sign in to sync your favorites and notes across devices',
        'Switch between Light, Dark, and System themes',
        ...(MULTI_STUDIO_ENABLED ? ['Switch to a different studio'] : []),
        'Replay this tour anytime and view the app history',
      ],
    },
    {
      key: 'done',
      icon: PartyPopper,
      tint: 'brand',
      title: "You're all set!",
      blurb: 'Star your favorites to start building your schedule.',
      points: [
        'You can reopen this tour anytime from Settings',
        'Enjoy the show! 🩰',
      ],
    },
  ];
}

// The admin-only tour: how to run the recital from the admin console. Tabs that
// only super-admins can see (Users, Dev Tools) are included only for them.
function buildAdminSteps({ isSuperAdmin }) {
  const steps = [
    {
      key: 'admin-welcome',
      icon: ShieldAlert,
      tint: 'amber',
      title: 'Admin Console',
      blurb: "Here's how to set up and run your recital from here.",
      points: [
        'Build your program: shows, acts, and performers',
        'Run the show live so every viewer follows along',
        'Click the ? in the admin panel anytime to reopen this guide',
      ],
    },
    {
      key: 'workspace',
      icon: Calendar,
      tint: 'brand',
      title: 'Shows & Acts',
      blurb: 'Build and manage your program.',
      points: [
        'Create a show with its date, time, and title',
        'Add, rename, and drag-to-reorder acts',
        'Add performers to each act (with optional notes)',
        'Import a whole lineup at once from a CSV file',
        'Hit Save — viewers see your changes live',
      ],
    },
    {
      key: 'live',
      icon: Radio,
      tint: 'rose',
      title: 'Run the Live Show',
      blurb: 'Drive the program in real time on show night.',
      points: [
        'Open the live controller for the selected show',
        'Advance the current act (arrow keys, or Space for next)',
        'Every viewer’s program and “Now Playing” updates automatically',
        'Start or stop tracking whenever you like',
      ],
    },
  ];

  if (isSuperAdmin) {
    steps.push({
      key: 'users',
      icon: Users,
      tint: 'sky',
      title: 'Users',
      blurb: 'Control who can manage this studio.',
      points: [
        'Add or remove studio admins',
        'Review who currently has access',
      ],
    });
    steps.push({
      key: 'tools',
      icon: Wrench,
      tint: 'ink',
      title: 'Dev Tools',
      blurb: 'Maintenance and testing utilities.',
      points: [
        'Seed demo data to experiment safely',
        'Repair shows orphaned by a studio change',
        'Clear the local cache to force a fresh load',
        'Preview or reset the user-facing tutorial',
      ],
    });
  }

  steps.push({
    key: 'admin-done',
    icon: Check,
    tint: 'brand',
    title: "That's the admin console",
    blurb: 'You’re ready to manage the recital.',
    points: [
      'Reopen this guide anytime with the ? button',
      'Your edits save to the cloud and reach viewers instantly',
    ],
  });

  return steps;
}

const TINT = {
  brand: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600',
  sky: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600',
  rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-500',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  ink: 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300',
};

export default function TutorialOverlay() {
  const {
    showTutorial, tutorialVariant, openTutorial, dismissTutorial,
    tutorialNeverSeen, isSuperAdmin,
  } = useApp();
  const [index, setIndex] = useState(0);

  const steps = useMemo(
    () => (tutorialVariant === 'admin' ? buildAdminSteps({ isSuperAdmin }) : buildGeneralSteps()),
    [tutorialVariant, isSuperAdmin]
  );

  // First-run auto-open of the user-facing tour. Mounted only inside the main
  // app shell, so by the time this runs the menus it describes are on screen.
  useEffect(() => {
    if (tutorialNeverSeen()) openTutorial('general');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always restart at the first step whenever the tour is (re)opened or the
  // variant changes.
  useEffect(() => {
    if (showTutorial) setIndex(0);
  }, [showTutorial, tutorialVariant]);

  const atEnd = index >= steps.length - 1;
  const next = () => (atEnd ? dismissTutorial() : setIndex(i => Math.min(i + 1, steps.length - 1)));
  const back = () => setIndex(i => Math.max(i - 1, 0));

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    if (!showTutorial) return;
    const onKey = (e) => {
      if (e.key === 'Escape') dismissTutorial();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTutorial, index, steps.length]);

  if (!showTutorial) return null;

  const step = steps[index];
  const Icon = step.icon;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tutorialVariant === 'admin' ? 'How to use the admin console' : 'How to use this app'}
      onClick={dismissTutorial}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-ink-800 rounded-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: progress + skip/close */}
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {steps.map((s, i) => (
              <span
                key={s.key}
                className={clsx(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-6 bg-brand-600' : i < index ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-ink-200 dark:bg-ink-600'
                )}
              />
            ))}
          </div>
          <button
            onClick={dismissTutorial}
            className="p-2 -mr-2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 transition-colors rounded-card"
            aria-label="Close tutorial"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — keyed so each step animates in */}
        <div key={step.key} className="px-6 pb-2 pt-3 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className={clsx('w-14 h-14 rounded-card flex items-center justify-center mb-4', TINT[step.tint])}>
            <Icon size={28} />
          </div>

          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-xl font-semibold dark:text-white">{step.title}</h2>
            {step.badge && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md">
                {step.badge}
              </span>
            )}
          </div>
          <p className="text-ink-500 dark:text-ink-400 text-sm leading-relaxed mb-4">{step.blurb}</p>

          <ul className="space-y-2.5">
            {step.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-ink-700 dark:text-ink-200">
                <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className="leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 mt-2">
          {index > 0 ? (
            <button
              onClick={back}
              className="inline-flex items-center gap-1 text-sm font-bold text-ink-500 dark:text-ink-400 hover:text-ink-800 dark:hover:text-white transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button
              onClick={dismissTutorial}
              className="text-sm font-bold text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 transition-colors"
            >
              {tutorialVariant === 'admin' ? 'Close' : 'Skip tour'}
            </button>
          )}

          <button
            onClick={next}
            className="inline-flex items-center gap-1.5 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-card font-bold text-sm shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
          >
            {atEnd ? (
              <>Got it <Check size={16} /></>
            ) : (
              <>Next <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
