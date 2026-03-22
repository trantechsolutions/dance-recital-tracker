import React, { useState, useMemo } from 'react';
import { Star, Search as SearchIcon, Cloud, Share2, Check, Heart, Hash } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { clsx } from 'clsx';

export default function SearchDancerView({ showData, selectedShow, favorites, toggleFavorite, user }) {
  const { orgId } = useApp();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    if (orgId) params.set('org', orgId);
    if (selectedShow) params.set('show', selectedShow);
    if (searchQuery) params.set('q', searchQuery);

    const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Dancer Search', url: shareUrl });
        return;
      } catch { /* user cancelled */ }
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Hook for Search Results
  const results = useMemo(() => {
    if (!showData || !showData.acts || !searchQuery.trim()) return [];

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

    return Object.entries(map)
      .map(([name, acts]) => ({ name, acts }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [searchQuery, showData]);

  // 2. Hook to gather currently favorited dancers in this show
  const favoriteDancers = useMemo(() => {
    if (!showData || !showData.acts || !favorites) return [];

    const map = {};
    showData.acts.forEach(act => {
      act.performers?.forEach(name => {
        if (favorites.has(name)) {
          if (!map[name]) map[name] = [];
          map[name].push({ number: act.number, title: act.title });
        }
      });
    });

    return Object.entries(map)
      .map(([name, acts]) => ({ name, acts }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [showData, favorites]);

  // 3. Early return goes AFTER all hooks
  if (!showData || !showData.acts) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="w-20 h-20 bg-pink-50 dark:bg-pink-900/20 rounded-full flex items-center justify-center mx-auto">
          <Heart size={36} className="text-pink-300 dark:text-pink-700" />
        </div>
        <div>
          <h3 className="text-lg font-black dark:text-white mb-1">No Show Selected</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Select a show to search for dancers.
          </p>
        </div>
      </div>
    );
  }

  const DancerCard = ({ res }) => {
    const isFav = favorites?.has(res.name);
    return (
      <div className={clsx(
        "p-5 bg-white dark:bg-slate-800 rounded-2xl border shadow-sm h-full transition-all hover:shadow-md",
        isFav
          ? "border-pink-200 dark:border-pink-800 border-l-4 border-l-pink-600"
          : "border-slate-100 dark:border-slate-700"
      )}>
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0",
              isFav
                ? "bg-pink-100 dark:bg-pink-900/40 text-pink-600"
                : "bg-slate-100 dark:bg-slate-900 text-slate-400"
            )}>
              {res.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className={clsx(
                "font-black truncate",
                isFav ? "text-pink-600 dark:text-pink-400" : "dark:text-white"
              )}>
                {res.name}
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                {res.acts.length} performance{res.acts.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <button
            onClick={() => toggleFavorite(res.name)}
            className={clsx(
              "p-2.5 rounded-xl transition-colors shrink-0",
              isFav
                ? "text-pink-600 bg-pink-50 dark:bg-pink-900/20"
                : "text-slate-300 hover:text-pink-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            <Star size={20} fill={isFav ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Act list */}
        <div className="mt-3 space-y-1.5">
          {res.acts.map(a => (
            <div key={a.number} className="flex items-center gap-2 text-xs">
              <span className={clsx(
                "inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md",
                isFav
                  ? "bg-pink-50 dark:bg-pink-900/20 text-pink-600"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-500"
              )}>
                <Hash size={10} />{a.number}
              </span>
              <span className="text-slate-500 dark:text-slate-400 truncate">{a.title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Enter dancer's name..."
            className="w-full bg-white dark:bg-slate-800 p-5 pl-14 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 font-bold text-lg dark:text-white outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          onClick={handleShare}
          title="Share this search"
          className="bg-white dark:bg-slate-800 w-[68px] rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 active:scale-95 transition-all shrink-0"
        >
          {copied ? <Check size={24} className="text-emerald-500" /> : <Share2 size={24} />}
        </button>
      </div>

      {/* Results count */}
      {searchQuery && results.length > 0 && (
        <div className="px-1">
          <span className="text-xs font-bold text-slate-400">
            {results.length} dancer{results.length !== 1 ? 's' : ''} found
          </span>
        </div>
      )}

      <div>
        {searchQuery ? (
          <>
            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map(res => <DancerCard key={res.name} res={res} />)}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <SearchIcon size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-slate-400 font-bold">No dancers found matching "{searchQuery}"</p>
                <p className="text-slate-300 text-sm mt-1">Try a different spelling or partial name</p>
              </div>
            )}
          </>
        ) : (
          <>
            {favoriteDancers.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 mb-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Your Favorited Dancers
                  </h3>
                  {user && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md" title="Synced to cloud">
                      <Cloud size={12} /> Synced
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favoriteDancers.map(res => <DancerCard key={res.name} res={res} />)}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <Heart size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-slate-400 font-bold">Search for a performer</p>
                <p className="text-slate-300 text-sm mt-1">Type a name above to find their performances</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
