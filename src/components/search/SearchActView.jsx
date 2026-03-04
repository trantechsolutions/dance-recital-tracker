import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Search as SearchIcon, Cloud, Share2, Check } from 'lucide-react';
import ActCard from '../program/ActCard';

export default function SearchActView({ showData, selectedShow, favorites, currentAct, toggleFavorite, user }) {
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
        await navigator.share({ title: 'Act Search', url: shareUrl });
        return;
      } catch (err) {}
    }
    
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchParams(prev => {
      if (val) prev.set('q', val);
      else prev.delete('q');
      return prev;
    }, { replace: true }); 
  };

  // 1. Hook for Search Results
  const results = useMemo(() => {
    if (!searchQuery.trim() || !showData?.acts) return [];
    
    const q = searchQuery.toLowerCase();
    return showData.acts.filter(act => 
      act.title?.toLowerCase().includes(q) || 
      String(act.number).includes(q) ||
      act.performers?.some(p => p.toLowerCase().includes(q))
    );
  }, [searchQuery, showData]);

  // 2. Hook for Favorited Acts (Direct act favorites OR containing a favorited dancer)
  const favoriteActs = useMemo(() => {
    if (!showData?.acts || !favorites) return [];
    
    return showData.acts.filter(act => 
      favorites.has(`act-${act.number}`) || 
      act.performers?.some(p => favorites.has(p))
    );
  }, [showData, favorites]);

  // 3. Early return goes AFTER all hooks
  if (!showData || !showData.acts) {
    return (
      <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-slate-400 font-medium">Select a show to search through the acts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by act title or number..." 
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

      <div>
        {searchQuery ? (
          // --- SHOW SEARCH RESULTS ---
          <>
            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map(act => (
                  <ActCard 
                    key={act.number} 
                    act={act} 
                    isCurrent={currentAct.isTracking && act.number === currentAct.number} 
                    toggleFavorite={toggleFavorite}
                    favorites={favorites}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-10 italic">No acts found matching "{searchQuery}"</p>
            )}
          </>
        ) : (
          // --- SHOW FAVORITES (WHEN SEARCH IS EMPTY) ---
          <>
            {favoriteActs.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 mb-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Your Favorited Acts
                  </h3>
                  {user && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md" title="Synced to cloud">
                      <Cloud size={12} /> Synced
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favoriteActs.map(act => (
                    <ActCard 
                      key={act.number} 
                      act={act} 
                      isCurrent={currentAct.isTracking && act.number === currentAct.number} 
                      toggleFavorite={toggleFavorite}
                      favorites={favorites}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-10">Start typing to search the program.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}