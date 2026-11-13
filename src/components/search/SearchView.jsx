import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { Search as SearchIcon, Share2, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ActCard from '../program/ActCard';
import ActDetailModal from '../program/ActDetailModal';
import { displayName } from '../../utils/names';
import { findDancers, findActs } from '../../utils/find';

const listNumbers = (nums) =>
  nums.length <= 1 ? `${nums[0] ?? ''}` : `${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`;

// Find: one search box for dancers and acts. Dancers first (that's what parents
// look for), searched across every show; acts from the show being viewed.
export default function SearchView({ recitalData, showData, selectedShow, favorites, currentAct, actLog, toggleFavorite, user, showId }) {
  const { orgId, canViewFullNames } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(() => searchParams.get('q') || '');
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [copied, setCopied] = useState(false);
  const [selectedAct, setSelectedAct] = useState(null);
  const debounce = useRef(null);
  const nameFn = useCallback((n) => displayName(n, canViewFullNames), [canViewFullNames]);

  const onChange = (e) => {
    const v = e.target.value;
    setInputValue(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setQuery(v);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('tab');
        if (v.trim()) next.set('q', v); else next.delete('q');
        return next;
      }, { replace: true });
    }, 200);
  };

  const dancers = useMemo(
    () => (user ? findDancers(recitalData, showId, query, nameFn) : []),
    [recitalData, showId, query, nameFn, user]
  );
  const acts = useMemo(() => findActs(showData, query), [showData, query]);
  const following = useMemo(() => [...(favorites || [])].filter(f => !f.startsWith('act-')), [favorites]);

  const handleShare = async () => {
    const params = new URLSearchParams();
    if (orgId) params.set('org', orgId);
    if (selectedShow) params.set('show', selectedShow);
    if (query) params.set('q', query);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Find', url }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasQuery = query.trim().length > 0;
  const nothing = hasQuery && dancers.length === 0 && acts.length === 0;

  return (
    <div className="space-y-6 animate-in fade-in pb-6">
      <div className="flex items-end gap-2">
        <label className="flex-1 space-y-1.5">
          <span className="text-sm font-semibold text-ink-700 dark:text-ink-200 px-0.5">Find a dancer or act</span>
          <span className="relative block">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" size={18} />
            <input
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Dancer's name, act title or number"
              value={inputValue}
              onChange={onChange}
              className="w-full h-[52px] pl-11 pr-4 rounded-card bg-white dark:bg-ink-800 border-2 border-ink-300 dark:border-ink-600 focus:border-ink-900 dark:focus:border-white outline-none text-base font-medium dark:text-white"
            />
          </span>
        </label>
        {hasQuery && (
          <button
            onClick={handleShare}
            aria-label="Share this search"
            className="w-[52px] h-[52px] shrink-0 rounded-card border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 flex items-center justify-center text-ink-600 dark:text-ink-300"
          >
            {copied ? <Check size={20} className="text-emerald-600" /> : <Share2 size={20} />}
          </button>
        )}
      </div>

      {!hasQuery && (
        <section className="space-y-3 px-0.5">
          {user && following.length > 0 ? (
            <>
              <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400">You follow</h2>
              <div className="flex flex-wrap gap-2">
                {following.map(name => (
                  <span key={name} className="h-9 pl-3 pr-1 rounded-pill bg-brand-50 dark:bg-brand-900/30 text-brand-800 dark:text-brand-200 text-sm font-semibold flex items-center gap-1">
                    {nameFn(name)}
                    <button onClick={() => toggleFavorite(name)} aria-label={`Stop following ${nameFn(name)}`} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-brand-100 dark:hover:bg-brand-900/50">×</button>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-ink-600 dark:text-ink-300">
              Type a first name to find your dancer, then follow them. We'll mark their acts in the program.
            </p>
          )}
        </section>
      )}

      {hasQuery && !user && (
        <p className="p-4 rounded-card border border-ink-200 dark:border-ink-700 text-sm text-ink-600 dark:text-ink-300">
          Dancer names are only shown to signed-in families. <Link to="/settings" className="font-semibold underline">Sign in</Link> to search for a dancer.
        </p>
      )}

      {dancers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400 mb-1 px-0.5">Dancers</h2>
          <ul className="divide-y divide-ink-100 dark:divide-ink-800 border-y border-ink-100 dark:border-ink-800">
            {dancers.map(d => {
              const isFollowing = favorites?.has(d.name);
              return (
                <li key={d.name} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold dark:text-white">{nameFn(d.name)}</p>
                    {d.duplicate && <p className="text-xs font-semibold text-stage-700 dark:text-stage-300">Same name as another dancer. Check the act numbers.</p>}
                    <p className="text-sm text-ink-600 dark:text-ink-400">
                      {d.here.length > 0
                        ? `Act${d.here.length > 1 ? 's' : ''} ${listNumbers(d.here.map(a => a.number))}`
                        : 'Not in this show'}
                      {d.elsewhere.map(e => (
                        <span key={e.showId} className="block text-xs text-ink-500 dark:text-ink-500">
                          Also in {e.label}: act{e.numbers.length > 1 ? 's' : ''} {listNumbers(e.numbers)}
                        </span>
                      ))}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFavorite(d.name)}
                    aria-pressed={!!isFollowing}
                    className={clsx(
                      "h-11 px-4 rounded-card text-sm font-semibold shrink-0 transition-colors",
                      isFollowing
                        ? "bg-brand-700 text-white hover:bg-brand-800"
                        : "border border-ink-800 dark:border-ink-300 text-ink-900 dark:text-white hover:bg-ink-50 dark:hover:bg-ink-800"
                    )}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {acts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400 mb-2 px-0.5">Acts in {showData?.label || 'this show'}</h2>
          <div className="space-y-2.5">
            {acts.map(act => (
              <ActCard
                key={act.number}
                act={act}
                isCurrent={currentAct?.isTracking && Number(act.number) === Number(currentAct.number)}
                toggleFavorite={toggleFavorite}
                favorites={favorites}
                onClick={() => setSelectedAct(act)}
                showId={showId}
              />
            ))}
          </div>
        </section>
      )}

      {nothing && user && (
        <p className="text-ink-600 dark:text-ink-300 px-0.5">
          Nothing matches “{query.trim()}”. Try the first name only, or check the spelling.
        </p>
      )}

      <ActDetailModal
        act={selectedAct}
        isOpen={!!selectedAct}
        onClose={() => setSelectedAct(null)}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        isCurrent={selectedAct && currentAct?.isTracking && Number(currentAct.number) === Number(selectedAct?.number)}
        showId={showId}
        acts={showData?.acts}
        onNavigate={setSelectedAct}
        currentAct={currentAct}
        actLog={actLog}
      />
    </div>
  );
}
