import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Search as SearchIcon, Cloud, Share2, Check, Music, Heart, Hash, Star, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import ActCard from '../program/ActCard';
import ActDetailModal from '../program/ActDetailModal';
import { lastInitial } from '../../utils/names';

export default function SearchView({ showData, selectedShow, favorites, currentAct, toggleFavorite, user, showId }) {
  const { orgId } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') === 'dancers' ? 'dancers' : 'acts';
  const [inputValue, setInputValue] = useState(() => searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const debounceTimer = useRef(null);
  const [copied, setCopied] = useState(false);
  const [selectedAct, setSelectedAct] = useState(null);

  const setTab = (tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      next.delete('q');
      return next;
    });
    setInputValue('');
    setSearchQuery('');
  };

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setInputValue(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setSearchQuery(val), 250);
  }, []);

  const handleShare = async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (orgId) params.set('org', orgId);
    if (selectedShow) params.set('show', selectedShow);
    params.set('tab', activeTab);
    if (searchQuery) params.set('q', searchQuery);
    const shareUrl = `${baseUrl}?${params.toString()}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Search', url: shareUrl }); return; }
      catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Acts tab logic ---
  const actResults = useMemo(() => {
    if (!searchQuery.trim() || !showData?.acts) return [];
    const q = searchQuery.toLowerCase();
    return showData.acts.filter(act =>
      act.title?.toLowerCase().includes(q) ||
      String(act.number).includes(q) ||
      act.performers?.some(p => p.toLowerCase().includes(q))
    );
  }, [searchQuery, showData]);

  const favoriteActs = useMemo(() => {
    if (!showData?.acts || !favorites) return [];
    return showData.acts.filter(act =>
      favorites.has(showId ? `act-${showId}-${act.number}` : `act-${act.number}`) ||
      act.performers?.some(p => favorites.has(p))
    );
  }, [showData, favorites, showId]);

  // --- Dancers tab logic ---
  const dancerResults = useMemo(() => {
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
          <Music size={28} className="text-brand-300 dark:text-brand-700" />
        </div>
        <h3 className="text-base font-semibold dark:text-white">No Show Selected</h3>
        <p className="text-ink-400 text-sm px-4">Select a show to search acts and dancers.</p>
      </div>
    );
  }

  const placeholder = activeTab === 'acts' ? 'Search acts by title, number, or performer…' : 'Search dancers by name…';

  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in pb-6">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-ink-100 dark:bg-ink-800 rounded-card">
        <button
          onClick={() => setTab('acts')}
          className={clsx(
            "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
            activeTab === 'acts'
              ? "bg-white dark:bg-ink-700 text-brand-600 shadow-sm"
              : "text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-white"
          )}
        >
          Acts
        </button>
        <button
          onClick={() => setTab('dancers')}
          className={clsx(
            "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
            activeTab === 'dancers'
              ? "bg-white dark:bg-ink-700 text-brand-600 shadow-sm"
              : "text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-white"
          )}
        >
          Dancers
        </button>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
          <input
            type="text"
            placeholder={placeholder}
            className="w-full bg-white dark:bg-ink-800 p-3.5 sm:p-4 pl-10 sm:pl-12 rounded-card sm:rounded-card shadow-sm border border-ink-200 dark:border-ink-700 font-bold text-[15px] sm:text-base dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
            value={inputValue}
            onChange={handleSearchChange}
          />
        </div>
        <button
          onClick={handleShare}
          className="bg-white dark:bg-ink-800 w-12 sm:w-[52px] rounded-card sm:rounded-card shadow-sm border border-ink-200 dark:border-ink-700 flex items-center justify-center text-brand-600 hover:bg-brand-50 active:scale-95 transition-all shrink-0"
          aria-label="Share search"
        >
          {copied ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} />}
        </button>
      </div>

      {activeTab === 'acts' ? (
        <ActsPanel
          searchQuery={searchQuery}
          actResults={actResults}
          favoriteActs={favoriteActs}
          currentAct={currentAct}
          toggleFavorite={toggleFavorite}
          favorites={favorites}
          showId={showId}
          user={user}
          onActClick={setSelectedAct}
        />
      ) : (
        <DancersPanel
          searchQuery={searchQuery}
          dancerResults={dancerResults}
          favoriteDancers={favoriteDancers}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          user={user}
        />
      )}

      <ActDetailModal
        act={selectedAct}
        isOpen={!!selectedAct}
        onClose={() => setSelectedAct(null)}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        isCurrent={selectedAct && currentAct?.isTracking && Number(currentAct.number) === Number(selectedAct?.number)}
        showId={showId}
      />
    </div>
  );
}

function ActsPanel({ searchQuery, actResults, favoriteActs, currentAct, toggleFavorite, favorites, showId, user, onActClick }) {
  if (searchQuery) {
    if (actResults.length > 0) {
      return (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-ink-400 px-0.5">{actResults.length} result{actResults.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
            {actResults.map(act => (
              <ActCard key={act.number} act={act} isCurrent={currentAct?.isTracking && act.number === currentAct.number} toggleFavorite={toggleFavorite} favorites={favorites} onClick={() => onActClick(act)} showId={showId} />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="text-center py-12 bg-white dark:bg-ink-800 rounded-card border border-ink-100 dark:border-ink-700">
        <SearchIcon size={36} className="mx-auto text-ink-200 dark:text-ink-700 mb-3" />
        <p className="text-ink-400 font-bold text-sm">No acts found for "{searchQuery}"</p>
        <p className="text-ink-300 text-xs mt-1">Try a different search term</p>
      </div>
    );
  }

  if (favoriteActs.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-[10px] font-semibold uppercase text-ink-400 tracking-widest">Your Favorited Acts</h3>
          {user && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
              <Cloud size={10} /> Synced
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
          {favoriteActs.map(act => (
            <ActCard key={act.number} act={act} isCurrent={currentAct?.isTracking && act.number === currentAct.number} toggleFavorite={toggleFavorite} favorites={favorites} onClick={() => onActClick(act)} showId={showId} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 bg-white dark:bg-ink-800 rounded-card border border-ink-100 dark:border-ink-700">
      <SearchIcon size={36} className="mx-auto text-ink-200 dark:text-ink-700 mb-3" />
      <p className="text-ink-400 font-bold text-sm">Search the program</p>
      <p className="text-ink-300 text-xs mt-1">Find acts by title, number, or performer</p>
    </div>
  );
}

function DancerCard({ res, favorites, toggleFavorite }) {
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
}

function DancersPanel({ searchQuery, dancerResults, favoriteDancers, favorites, toggleFavorite, user }) {
  // Dancer names are hidden from logged-out visitors to protect performers'
  // privacy — searching by name requires an account.
  if (!user) {
    return (
      <div className="text-center py-12 bg-white dark:bg-ink-800 rounded-card border border-ink-100 dark:border-ink-700 space-y-4">
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

  if (searchQuery) {
    if (dancerResults.length > 0) {
      return (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-ink-400 px-0.5">{dancerResults.length} dancer{dancerResults.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
            {dancerResults.map(res => <DancerCard key={res.name} res={res} favorites={favorites} toggleFavorite={toggleFavorite} />)}
          </div>
        </div>
      );
    }
    return (
      <div className="text-center py-12 bg-white dark:bg-ink-800 rounded-card border border-ink-100 dark:border-ink-700">
        <SearchIcon size={36} className="mx-auto text-ink-200 dark:text-ink-700 mb-3" />
        <p className="text-ink-400 font-bold text-sm">No dancers found for "{searchQuery}"</p>
        <p className="text-ink-300 text-xs mt-1">Try a different spelling</p>
      </div>
    );
  }

  if (favoriteDancers.length > 0) {
    return (
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
          {favoriteDancers.map(res => <DancerCard key={res.name} res={res} favorites={favorites} toggleFavorite={toggleFavorite} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 bg-white dark:bg-ink-800 rounded-card border border-ink-100 dark:border-ink-700">
      <Heart size={36} className="mx-auto text-ink-200 dark:text-ink-700 mb-3" />
      <p className="text-ink-400 font-bold text-sm">Search for a performer</p>
      <p className="text-ink-300 text-xs mt-1">Type a name above to find their acts</p>
    </div>
  );
}
