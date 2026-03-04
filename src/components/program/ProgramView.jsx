import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Share2, Check, Star, Clock } from 'lucide-react';
import ActCard from './ActCard';
import { clsx } from 'clsx';

export default function ProgramView({ showData, selectedShow, currentAct, favorites, toggleFavorite }) {
  const { orgId } = useApp();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Build the deep-link manually to keep the browser URL clean
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    
    if (orgId) params.set('org', orgId);
    if (selectedShow) params.set('show', selectedShow);
    
    const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${showData?.label || 'Recital'} Program`,
          url: shareUrl
        });
        return;
      } catch (err) { /* Silent fail for user cancel */ }
    }
    
    // Fallback: Clipboard
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!showData) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        <p className="text-slate-400 font-bold">Please select a performance to view the program.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header with Share Button */}
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-3xl font-black dark:text-white leading-tight">
            {showData.label}
          </h2>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">
            Official Program • {showData.acts?.length || 0} Acts
          </p>
        </div>
        
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-pink-600 font-bold text-sm shadow-sm hover:bg-pink-50 dark:hover:bg-pink-900/20 active:scale-95 transition-all"
        >
          {copied ? (
            <><Check size={18} className="text-emerald-500" /> Copied</>
          ) : (
            <><Share2 size={18} /> Share</>
          )}
        </button>
      </div>

      {/* Act List */}
      <div className="space-y-4">
        {showData.acts?.map((act) => (
          <ActCard 
            key={act.number} 
            act={act} 
            isCurrent={currentAct === act.number}
            isFavorited={favorites.has(act.title)}
            onFavorite={() => toggleFavorite(act.title)}
          />
        ))}
      </div>
    </div>
  );
}