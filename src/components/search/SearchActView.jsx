import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Search as SearchIcon, Cloud, Share2, Check, Music } from 'lucide-react';
import ActCard from '../program/ActCard';
import ActDetailModal from '../program/ActDetailModal';

export default function SearchActView({ showData, selectedShow, favorites, currentAct, toggleFavorite, user }) {
  const { orgId } = useApp();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [copied, setCopied] = useState(false);
  const [selectedAct, setSelectedAct] = useState(null);

  const handleShare = async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (orgId) params.set('org', orgId);
    if (selectedShow) params.set('show', selectedShow);
    if (searchQuery) params.set('q', searchQuery);
    const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    if (navigator.share) {
      try { await navigator.share({ title: 'Act Search', url: shareUrl }); return; }
      catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const results = useMemo(() => {
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
      favorites.has(`act-${act.number}`) ||
      act.performers?.some(p => favorites.has(p))
    );
  }, [showData, favorites]);

  if (!showData || !showData.acts) {
    return (
      <div className="text-center py-12 sm:py-20 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
        <div className="w-16 h-16 bg-pink-50 dark:bg-pink-900/20 rounded-full flex items-center justify-center mx-auto">
          <Music size={28} className="text-pink-300 dark:text-pink-700" />
        </div>
        <h3 className="text-base font-black dark:text-white">No Show Selected</h3>
        <p className="text-slate-400 text-sm px-4">Select a show to search through the acts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in pb-6">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search acts..."
            className="w-full bg-white dark:bg-slate-800 p-3.5 sm:p-4 pl-10 sm:pl-12 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 font-bold text-[15px] sm:text-lg dark:text-white outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={handleShare}
          className="bg-white dark:bg-slate-800 w-12 sm:w-[60px] rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-pink-600 hover:bg-pink-50 active:scale-95 transition-all shrink-0"
        >
          {copied ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} />}
        </button>
      </div>

      {searchQuery && results.length > 0 && (
        <p className="text-[11px] font-bold text-slate-400 px-0.5">{results.length} result{results.length !== 1 ? 's' : ''}</p>
      )}

      <div>
        {searchQuery ? (
          results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
              {results.map(act => (
                <ActCard key={act.number} act={act} isCurrent={currentAct?.isTracking && act.number === currentAct.number} toggleFavorite={toggleFavorite} favorites={favorites} onClick={() => setSelectedAct(act)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              <SearchIcon size={36} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
              <p className="text-slate-400 font-bold text-sm">No acts found for "{searchQuery}"</p>
              <p className="text-slate-300 text-xs mt-1">Try a different search term</p>
            </div>
          )
        ) : (
          favoriteActs.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Your Favorited Acts</h3>
                {user && (
                  <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                    <Cloud size={10} /> Synced
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                {favoriteActs.map(act => (
                  <ActCard key={act.number} act={act} isCurrent={currentAct?.isTracking && act.number === currentAct.number} toggleFavorite={toggleFavorite} favorites={favorites} onClick={() => setSelectedAct(act)} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              <SearchIcon size={36} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
              <p className="text-slate-400 font-bold text-sm">Search the program</p>
              <p className="text-slate-300 text-xs mt-1">Find acts by title, number, or performer</p>
            </div>
          )
        )}
      </div>

      <ActDetailModal act={selectedAct} isOpen={!!selectedAct} onClose={() => setSelectedAct(null)} favorites={favorites} toggleFavorite={toggleFavorite} isCurrent={selectedAct && currentAct?.isTracking && Number(currentAct.number) === Number(selectedAct.number)} />
    </div>
  );
}
