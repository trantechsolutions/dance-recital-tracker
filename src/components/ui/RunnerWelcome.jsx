import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const keyFor = (email) => `runnerWelcome_v1:${(email || '').toLowerCase()}`;

// Shown once to someone who has just been made a show runner, so they know
// what they can do and where it lives.
export default function RunnerWelcome({ recitalData }) {
  const { user, isShowRunner, isAuthorized, runnerShows } = useApp();
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem(keyFor(user?.email)); } catch { return true; }
  });
  if (!isShowRunner || isAuthorized || dismissed || !user) return null;

  const which = runnerShows?.length
    ? runnerShows.map(id => recitalData?.[id]?.label).filter(Boolean).join(', ') || 'your shows'
    : 'every show';
  const close = () => {
    try { localStorage.setItem(keyFor(user.email), new Date().toISOString()); } catch { /* private mode */ }
    setDismissed(true);
  };

  return (
    <div role="status" className="mb-5 p-4 rounded-card border-2 border-ink-900 dark:border-white bg-white dark:bg-ink-800 space-y-3">
      <p className="dark:text-white">
        <span className="font-semibold">You&rsquo;re a show runner for {which}.</span>{' '}
        On show day you&rsquo;ll move the program from act to act for every parent.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link to="/admin" onClick={close} className="h-11 px-4 rounded-card bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-semibold flex items-center">
          See how it works
        </Link>
        <button onClick={close} className="h-11 px-3 text-sm text-ink-600 dark:text-ink-300 underline">Got it</button>
      </div>
    </div>
  );
}
