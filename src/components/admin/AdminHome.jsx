import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronRight, HelpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

// Admin landing: show day first. Every show you may run gets one button;
// setup (editing shows, access) sits underneath for admins only.
export default function AdminHome({ recitalData, liveShowId }) {
  const { isAuthorized, isShowRunner, canRunShow, openTutorial } = useApp();
  if (!isAuthorized && !isShowRunner) return <Navigate to="/" replace />;

  const shows = Object.values(recitalData || {})
    .filter(s => canRunShow(s.id))
    .sort((a, b) => (b.id === liveShowId) - (a.id === liveShowId));

  return (
    <div className="space-y-8 animate-in fade-in">
      <header className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-sm text-ink-500 dark:text-ink-400">{isAuthorized ? 'Admin' : 'Show runner'}</p>
          <h2 className="font-display text-3xl sm:text-4xl font-medium dark:text-white">Run a show</h2>
        </div>
        {isAuthorized && (
          <button
            onClick={() => openTutorial('admin')}
            aria-label="How to use the admin console"
            className="w-11 h-11 flex items-center justify-center rounded-card bg-ink-100 dark:bg-ink-800 text-ink-500 hover:text-brand-600 transition-colors"
          >
            <HelpCircle size={20} />
          </button>
        )}
      </header>

      {shows.length === 0 ? (
        <p className="p-6 rounded-card border border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-300">
          {isAuthorized
            ? <>No shows yet. <Link to="/admin/setup" className="font-semibold underline">Add your first show</Link>.</>
            : 'You haven’t been given a show to run yet. Ask a studio admin to add you.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {shows.map(show => {
            const live = show.id === liveShowId;
            return (
              <li
                key={show.id}
                className={clsx(
                  "p-4 sm:p-5 rounded-card bg-white dark:bg-ink-800 flex flex-col sm:flex-row sm:items-center gap-4",
                  live ? "border-2 border-stage-400" : "border border-ink-200 dark:border-ink-700"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-display text-xl dark:text-white">{show.label}</p>
                  <p className={clsx("text-sm mt-0.5", live ? "text-stage-700 dark:text-stage-300 font-semibold" : "text-ink-500 dark:text-ink-400")}>
                    {show.acts.length} acts. {live ? 'Live now.' : 'Not live.'}
                  </p>
                </div>
                <Link
                  to={`/admin/run/${show.id}`}
                  className={clsx(
                    "h-12 px-6 rounded-card font-semibold text-sm flex items-center justify-center transition-colors",
                    live ? "bg-stage-400 text-ink-900 hover:bg-stage-300" : "bg-ink-900 dark:bg-white text-white dark:text-ink-900 hover:bg-ink-700"
                  )}
                >
                  {live ? 'Open the live show' : 'Run this show'}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {isAuthorized && (
        <section>
          <h3 className="text-sm font-semibold text-ink-500 dark:text-ink-400 mb-2 px-0.5">Set up</h3>
          <ul className="rounded-card border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 divide-y divide-ink-100 dark:divide-ink-700">
            {[
              { to: '/admin/setup', label: 'Shows and running order', hint: 'Add shows, edit acts, import a spreadsheet' },
              { to: '/admin/access', label: 'Access and show runners', hint: 'Studio code, family link, who can help' },
            ].map(item => (
              <li key={item.to}>
                <Link to={item.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-ink-50 dark:hover:bg-ink-700/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-sm dark:text-white">{item.label}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">{item.hint}</p>
                  </div>
                  <ChevronRight size={16} className="text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
