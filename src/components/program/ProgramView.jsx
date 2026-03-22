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

  // Program stats
  const stats = useMemo(() => {
    if (!showData?.acts) return null;
    const totalPerformers = new Set();
    showData.acts.forEach(act => {
      act.performers?.forEach(p => totalPerformers.add(p));
    });
    return {
      acts: showData.acts.length,
      performers: totalPerformers.size,
    };
  }, [showData]);

  // Progress through the show
  const progress = useMemo(() => {
    if (!showData?.acts?.length || !currentAct?.isTracking) return null;
    const total = showData.acts.length;
    const current = currentAct.number || 0;
    return Math.min(Math.round((current / total) * 100), 100);
  }, [showData, currentAct]);

  const handleShare = async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (orgId) params.set('org', orgId);
    if (selectedShow) params.set('show', selectedShow);
    const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${showData?.label || 'Recital'} Program`, url: shareUrl });
        return;
      } catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!showData) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="w-20 h-20 bg-pink-50 dark:bg-pink-900/20 rounded-full flex items-center justify-center mx-auto">
          <Music size={36} className="text-pink-300 dark:text-pink-700" />
        </div>
        <div>
          <h3 className="text-lg font-black dark:text-white mb-1">No Performance Selected</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Choose a performance from the dropdown above to view its program.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in" ref={programRef}>
      {/* Header with actions */}
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-3xl font-black dark:text-white leading-tight">{showData.label}</h2>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">
            Official Program
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Print program"
          >
            <Printer size={18} />
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-pink-600 font-bold text-sm shadow-sm hover:bg-pink-50 transition-all"
          >
            {copied ? <><Check size={18} className="text-emerald-500" /> Copied</> : <><Share2 size={18} /> Share</>}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-4 px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Hash size={14} className="text-pink-500" />
            {stats.acts} Acts
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Users size={14} className="text-pink-500" />
            {stats.performers} Performers
          </div>
          {progress !== null && (
            <>
              <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <BarChart3 size={14} className="text-pink-500" />
                {progress}% Complete
              </div>
            </>
          )}
        </div>
      )}

      {/* Progress Bar (visible during live tracking) */}
      {progress !== null && (
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Act List */}
      <div className="space-y-4 print-program">
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

      {/* Act Detail Modal */}
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
