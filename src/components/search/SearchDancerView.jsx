import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Star, Search as SearchIcon, Cloud, Share2, Check, Heart, Hash, Lock } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { clsx } from 'clsx';
import { lastInitial } from '../../utils/names';

export default function SearchDancerView({ showData, selectedShow, favorites, toggleFavorite, user }) {
  const { orgId } = useApp();
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(() => searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const debounceTimer = useRef(null);

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setInputValue(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setSearchQuery(val), 250);
  }, []);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (orgId) params.set('org', orgId);
    if (selectedShow) params.set('show', selectedShow);
    if (searchQuery) params.set('q', searchQuery);
    const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    if (navigator.share) {
      try { await navigator.share({ title: 'Dancer Search', url: shareUrl }); return; }
      catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const results = useMemo(() => {
    if (!showData?.acts || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const map = {};
    showData.acts.forEach(act => {
      act.performers?.forEach(name => {
        if (name.toLowerCase().includes(q)) {
          if (!map[name]) map[name] = [];
          map[name].push({ number: act.number, title: act.title });
        }
      });
    });
    return Object.entries(map).map(([name, acts]) => ({ name, acts })).sort((a, b) => a.name.localeCompare(b.name));
  }, [searchQuery, showData]);

  const favoriteDancers = useMemo(() => {
    if (!showData?.acts || !favorites) return [];
    const map = {};
    showData.acts.forEach(act => {
      act.performers?.forEach(name => {
        if (favorites.has(name)) {
          if (!map[name]) map[name] = [];
          map[name].push({ number: act.number, title: act.title });
        }
      });
    });
    return Object.entries(map).map(([name, acts]) => ({ name, acts })).sort((a, b) => a.name.localeCompare(b.name));
  }, [showData, favorites]);

  if (!showData || !showData.acts) {
    return (
      <div className="text-center py-12 sm:py-20 bg-white dark:bg-ink-800 rounded-card sm:rounded-card border border-ink-100 dark:border-ink-700 shadow-sm space-y-3">
        <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto">
          <Heart size={28} className="text-brand-300 dark:text-brand-700" />
        </div>
        <h3 className="text-base font-semibold dark:text-white">No Show Selected</h3>
        <p className="text-ink-400 text-sm px-4">Select a show to search for dancers.</p>
      </div>
    );
  }

  // Searching by dancer name requires an account — names are hidden from
  // logged-out visitors to protect performers' privacy.
  if (!user) {
    return (
      <div className="text-center py-12 sm:py-20 bg-white dark:bg-ink-800 rounded-card border border-ink-100 dark:border-ink-700 shadow-sm space-y-4 animate-in fade-in">
        <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto">
          <Lock size={28} className="text-brand-400 dark:text-brand-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold dark:text-white mb-1">Sign in to search dancers</h3>
          <p className="text-ink-400 text-sm max-w-sm mx-auto px-4">
            Dancer names are hidden to protect performers' privacy. Sign in to search and favorite dancers.
          </p>
        </div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-card font-bold text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-colors"
        >
          <Lock size={16} /> Sign In
        </Link>
      </div>
    );
  }

  const DancerCard = ({ res }) => {
    const isFav = favorites?.has(res.name);
    return (
      <div className={clsx(
        "p-3.5 sm:p-4 bg-white dark:bg-ink-800 rounded-card border shadow-sm h-full transition-all",
        isFav
          ? "border-brand-200 dark:border-brand-800 border-l-4 border-l-brand-600"
          : "border-ink-100 dark:border-ink-700"
      )}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={clsx(
              "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
              isFav ? "bg-brand-100 dark:bg-brand-900/40 text-brand-600" : "bg-ink-100 dark:bg-ink-900 text-ink-400"
            )}>
              {res.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className={clsx("font-bold text-sm truncate", isFav ? "text-brand-600 dark:text-brand-400" : "dark:text-white")}>
                {lastInitial(res.name)}
              </div>
              <div className="text-[10px] font-bold text-ink-400">{res.acts.length} act{res.acts.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <button
            onClick={() => toggleFavorite(res.name)}
            className={clsx(
              "p-2 rounded-card transition-colors shrink-0",
              isFav ? "text-brand-600 bg-brand-50 dark:bg-brand-900/20" : "text-ink-300 hover:text-brand-400"
            )}
          >
            <Star size={18} fill={isFav ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="mt-2.5 space-y-1">
          {res.acts.map(a => (
            <div key={a.number} className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <span className={clsx(
                "inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded",
                isFav ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600" : "bg-ink-50 dark:bg-ink-900 text-ink-500"
              )}>
                <Hash size={9} />{a.number}
              </span>
              <span className="text-ink-500 dark:text-ink-400 truncate">{a.title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in pb-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
          <input
            type="text"
            placeholder="Search dancers..."
            className="w-full bg-white dark:bg-ink-800 p-3.5 sm:p-4 pl-10 sm:pl-12 rounded-card sm:rounded-card shadow-sm border border-ink-200 dark:border-ink-700 font-bold text-[15px] sm:text-lg dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
            value={inputValue}
            onChange={handleSearchChange}
          />
        </div>
        <button
          onClick={handleShare}
          className="bg-white dark:bg-ink-800 w-12 sm:w-[60px] rounded-card sm:rounded-card shadow-sm border border-ink-200 dark:border-ink-700 flex items-center justify-center text-brand-600 hover:bg-brand-50 active:scale-95 transition-all shrink-0"
        >
          {copied ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} />}
        </button>
      </div>

      {searchQuery && results.length > 0 && (
        <p className="text-[11px] font-bold text-ink-400 px-0.5">{results.length} dancer{results.length !== 1 ? 's' : ''}</p>
      )}

      <div>
        {searchQuery ? (
          results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
              {results.map(res => <DancerCard key={res.name} res={res} />)}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-ink-800 rounded-card border border-ink-100 dark:border-ink-700">
              <SearchIcon size={36} className="mx-auto text-ink-200 dark:text-ink-700 mb-3" />
              <p className="text-ink-400 font-bold text-sm">No dancers found for "{searchQuery}"</p>
              <p className="text-ink-300 text-xs mt-1">Try a different spelling</p>
            </div>
          )
        ) : (
          favoriteDancers.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-[10px] font-semibold uppercase text-ink-400 tracking-widest">Your Favorited Dancers</h3>
                {user && (
                  <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                    <Cloud size={10} /> Synced
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                {favoriteDancers.map(res => <DancerCard key={res.name} res={res} />)}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-ink-800 rounded-card border border-ink-100 dark:border-ink-700">
              <Heart size={36} className="mx-auto text-ink-200 dark:text-ink-700 mb-3" />
              <p className="text-ink-400 font-bold text-sm">Search for a performer</p>
              <p className="text-ink-300 text-xs mt-1">Type a name above to find their acts</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
