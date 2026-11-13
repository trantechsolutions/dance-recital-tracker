import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Search as SearchIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { displayName } from '../../utils/names';
import { findDancers } from '../../utils/find';

const listNumbers = (nums) =>
  nums.length <= 1 ? `${nums[0] ?? ''}` : `${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`;

// First visit, in two steps: which show is on your ticket, then who you're
// here to see. Replaces the automatic tour, which asked people to read six
// cards before they could do anything. Skippable at every step.
export default function Welcome({ recitalData, selectedShow, setSelectedShow, onDone }) {
  const { favorites, toggleFavorite, canViewFullNames } = useApp();
  const shows = useMemo(() => Object.values(recitalData || {}), [recitalData]);
  const [step, setStep] = useState(() => (shows.length > 1 && !selectedShow ? 'show' : 'dancer'));
  const [query, setQuery] = useState('');
  const nameFn = (n) => displayName(n, canViewFullNames);

  const results = useMemo(
    () => (query.trim().length >= 2 ? findDancers(recitalData, selectedShow, query, nameFn).slice(0, 8) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recitalData, selectedShow, query, canViewFullNames]
  );
  const following = [...(favorites || [])].filter(f => !f.startsWith('act-'));
  const firstName = following[0] ? nameFn(following[0]).split(' ')[0] : null;

  const totalSteps = shows.length > 1 ? 2 : 1;
  const stepNo = step === 'show' ? 1 : totalSteps;

  return (
    <div className="fixed inset-0 z-[150] bg-ink-50 dark:bg-ink-900 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className="min-h-full max-w-lg mx-auto px-5 py-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-500 dark:text-ink-400">Step {stepNo} of {totalSteps}</span>
          <button onClick={() => onDone('program')} className="h-11 px-2 text-sm underline text-ink-600 dark:text-ink-300">
            Skip
          </button>
        </div>

        {step === 'show' ? (
          <>
            <h1 className="font-display text-4xl font-medium leading-tight dark:text-white">Which show are you going to?</h1>
            <p className="text-ink-600 dark:text-ink-300">It&rsquo;s on your ticket. You can switch shows later from the top of the program.</p>
            <div className="space-y-3">
              {shows.map(show => {
                const picked = selectedShow === show.id;
                return (
                  <button
                    key={show.id}
                    onClick={() => setSelectedShow(show.id)}
                    aria-pressed={picked}
                    className={clsx(
                      "w-full grid grid-cols-[1fr_auto] rounded-card overflow-hidden text-left bg-white dark:bg-ink-800 transition-colors",
                      picked ? "border-2 border-ink-900 dark:border-white" : "border border-ink-300 dark:border-ink-600 hover:border-ink-500"
                    )}
                  >
                    <span className="px-4 py-4 font-display text-xl dark:text-white">{show.label}</span>
                    <span className={clsx(
                      "px-4 flex flex-col items-center justify-center border-l-2 border-dashed",
                      picked ? "border-ink-900 dark:border-white bg-ink-100 dark:bg-ink-700" : "border-ink-300 dark:border-ink-600"
                    )}>
                      <span className="font-display text-xl font-bold dark:text-white">{show.acts.length}</span>
                      <span className="text-xs text-ink-500 dark:text-ink-400">acts</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep('dancer')}
              disabled={!selectedShow}
              className="mt-auto h-14 rounded-card bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-semibold disabled:opacity-40"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl font-medium leading-tight dark:text-white">Who are you here to see?</h1>
            <label className="space-y-1.5 block">
              <span className="text-sm font-semibold dark:text-white">Dancer&rsquo;s first name</span>
              <span className="relative block">
                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                <input
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-[52px] pl-11 pr-4 rounded-card border-2 border-ink-300 dark:border-ink-600 focus:border-ink-900 dark:focus:border-white bg-white dark:bg-ink-800 outline-none text-base dark:text-white"
                />
              </span>
            </label>

            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {results.map(d => {
                const isFollowing = favorites?.has(d.name);
                const here = d.here.map(a => a.number);
                return (
                  <li key={d.name} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold dark:text-white">{nameFn(d.name)}</p>
                      {d.duplicate && <p className="text-xs font-semibold text-stage-700 dark:text-stage-300">Same name as another dancer. Check the act numbers.</p>}
                      <p className="text-sm text-ink-600 dark:text-ink-400">
                        {here.length ? `Act${here.length > 1 ? 's' : ''} ${listNumbers(here)}` : `In ${d.elsewhere.map(e => e.label).join(', ')}`}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(d.name)}
                      aria-pressed={!!isFollowing}
                      className={clsx(
                        "h-11 px-4 rounded-card text-sm font-semibold shrink-0",
                        isFollowing ? "bg-brand-700 text-white" : "border border-ink-800 dark:border-ink-300 dark:text-white"
                      )}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </li>
                );
              })}
            </ul>
            {query.trim().length >= 2 && results.length === 0 && (
              <p className="text-sm text-ink-600 dark:text-ink-300">No dancer called &ldquo;{query.trim()}&rdquo; in these shows. Try the first name only.</p>
            )}

            <p className="text-sm text-ink-600 dark:text-ink-300">
              We&rsquo;ll mark their acts in the program and tell you when to head back to your seat.
            </p>

            <div className="mt-auto flex flex-col gap-2">
              <button
                onClick={() => onDone(following.length ? 'my-night' : 'program')}
                className="h-14 rounded-card bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-semibold"
              >
                {following.length ? `See ${following.length > 1 ? 'their' : `${firstName}’s`} acts` : 'Show the full program'}
              </button>
              {totalSteps > 1 && (
                <button onClick={() => setStep('show')} className="h-11 text-sm text-ink-600 dark:text-ink-300 underline">
                  Back to shows
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
