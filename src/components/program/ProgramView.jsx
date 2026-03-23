import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Share2, Check, Printer, Music, Users, Hash, BarChart3 } from 'lucide-react';
import ActCard from './ActCard';
import ActDetailModal from './ActDetailModal';

export default function ProgramView({ showData, selectedShow, currentAct }) {
  const { orgId, favorites, toggleFavorite } = useApp();
  const [copied, setCopied] = useState(false);
  const [selectedAct, setSelectedAct] = useState(null);
  const programRef = useRef(null);

  const stats = useMemo(() => {
    if (!showData?.acts) return null;
    const totalPerformers = new Set();
    showData.acts.forEach(act => act.performers?.forEach(p => totalPerformers.add(p)));
    return { acts: showData.acts.length, performers: totalPerformers.size };
  }, [showData]);

  const progress = useMemo(() => {
    if (!showData?.acts?.length || !currentAct?.isTracking) return null;
    return Math.min(Math.round((currentAct.number / showData.acts.length) * 100), 100);
  }, [showData, currentAct]);

  const handleShare = async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (orgId) params.set('org', orgId);
    if (selectedShow) params.set('show', selectedShow);
    const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    if (navigator.share) {
      try { await navigator.share({ title: `${showData?.label || 'Recital'} Program`, url: shareUrl }); return; }
      catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!showData) {
    return (
      <div className="text-center py-12 sm:py-20 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-pink-50 dark:bg-pink-900/20 rounded-full flex items-center justify-center mx-auto">
          <Music size={28} className="text-pink-300 dark:text-pink-700" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-black dark:text-white mb-1">No Performance Selected</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto px-4">
            Choose a performance from the dropdown above to view its program.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in" ref={programRef}>
      {/* Header */}
      <div className="flex justify-between items-end px-0.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-3xl font-black dark:text-white leading-tight truncate">{showData.label}</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">
            Official Program
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => window.print()}
            className="hidden sm:flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-sm shadow-sm hover:bg-slate-50 transition-all"
          >
            <Printer size={16} />
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-pink-600 font-bold text-sm shadow-sm hover:bg-pink-50 transition-all"
          >
            {copied ? <><Check size={16} className="text-emerald-500" /> <span className="hidden sm:inline">Copied</span></> : <><Share2 size={16} /> <span className="hidden sm:inline">Share</span></>}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex items-center gap-3 sm:gap-4 px-0.5 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-400">
            <Hash size={12} className="text-pink-500" /> {stats.acts} Acts
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-400">
            <Users size={12} className="text-pink-500" /> {stats.performers} Performers
          </div>
          {progress !== null && (
            <>
              <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-400">
                <BarChart3 size={12} className="text-pink-500" /> {progress}%
              </div>
            </>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {progress !== null && (
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Act List */}
      <div className="space-y-2.5 sm:space-y-4 print-program">
        {showData.acts?.map((act) => (
          <ActCard
            key={act.number}
            act={act}
            isCurrent={currentAct?.isTracking && Number(currentAct.number) === Number(act.number)}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            onClick={() => setSelectedAct(act)}
          />
        ))}
      </div>

      <ActDetailModal
        act={selectedAct}
        isOpen={!!selectedAct}
        onClose={() => setSelectedAct(null)}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        isCurrent={selectedAct && currentAct?.isTracking && Number(currentAct.number) === Number(selectedAct.number)}
      />
    </div>
  );
}
