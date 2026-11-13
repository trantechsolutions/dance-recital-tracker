import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useApp } from '../../context/AppContext';
import { Share2, Check, Printer, Music, ChevronDown, Heart } from 'lucide-react';
import ActCard from './ActCard';
import ActDetailModal from './ActDetailModal';
import { getLiveStatus, whoLabel, scrollToCurrentAct } from '../../utils/liveProgress';
import { displayName } from '../../utils/names';
import { typicalActMs, minutesAway } from '../../utils/showControl';

// "4", "4 and 17", "4, 17 and 31"
const listNumbers = (nums) =>
  nums.length <= 1 ? `${nums[0] ?? ''}` : `${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`;

export default function ProgramView({ showData, selectedShow, currentAct, actLog, showId }) {
  const { orgId, favorites, toggleFavorite, canViewFullNames } = useApp();
  const [copied, setCopied] = useState(false);
  const [selectedAct, setSelectedAct] = useState(null);
  const [showFinished, setShowFinished] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const status = useMemo(
    () => getLiveStatus(showData, currentAct, favorites, showId),
    [showData, currentAct, favorites, showId]
  );
  const myIndexes = useMemo(() => new Set(status.myActs.map(a => a.index)), [status.myActs]);
  const typicalMs = useMemo(() => typicalActMs(actLog), [actLog]);

  // Arriving from the LiveBar's "Go to act" on another tab.
  useEffect(() => {
    if (!location.state?.jumpToLive) return;
    const t = setTimeout(scrollToCurrentAct, 50);
    navigate(location.pathname + location.search, { replace: true, state: null });
    return () => clearTimeout(t);
  }, [location.state, location.pathname, location.search, navigate]);

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
      <div className="text-center py-12 sm:py-20 bg-white dark:bg-ink-800 rounded-card border border-ink-100 dark:border-ink-700 shadow-sm space-y-3">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto">
          <Music size={28} className="text-brand-300 dark:text-brand-700" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-semibold dark:text-white mb-1">Choose your show</h3>
          <p className="text-ink-500 dark:text-ink-400 text-sm max-w-sm mx-auto px-4">
            Pick the show on your ticket from the list above to see its running order.
          </p>
        </div>
      </div>
    );
  }

  const acts = showData.acts || [];
  const { onStageIndex, tracking, intermission, ended } = status;
  // Acts before this index are finished. During intermission the act at
  // onStageIndex has finished too, and the next one opens the second half.
  const finishedBefore = intermission ? onStageIndex + 1 : onStageIndex;
  const foldFinished = tracking && finishedBefore > 0 && !showFinished;
  const resumeIndex = intermission ? onStageIndex + 1 : -1;

  const asideFor = (index) => {
    if (!tracking || onStageIndex < 0 || index <= onStageIndex) return null;
    if (index === onStageIndex + 1) return intermission ? 'First after the break' : 'Up next';
    if (myIndexes.has(index)) {
      const eta = minutesAway(index - onStageIndex, typicalMs);
      return `In ${index - onStageIndex} acts${eta ? `, ${eta}` : ''}`;
    }
    return null;
  };

  const visible = acts
    .map((act, index) => ({ act, index }))
    .filter(({ index }) => !(foldFinished && index < finishedBefore));

  // Pre-curtain summary: "Ava K. dances in acts 4, 17 and 31."
  const preShow = !tracking && status.myActs.length > 0 && (() => {
    const all = { favoritedDancers: [...new Set(status.myActs.flatMap(a => a.favoritedDancers))] };
    const { who, plural } = whoLabel(all, (n) => displayName(n, canViewFullNames));
    const nums = status.myActs.map(a => a.number);
    return `${who} ${plural ? 'dance' : 'dances'} in act${nums.length > 1 ? 's' : ''} ${listNumbers(nums)}.`;
  })();

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-end gap-3 px-0.5">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl sm:text-3xl font-medium dark:text-white leading-tight">{showData.label}</h2>
          <p className="text-ink-500 dark:text-ink-400 text-xs font-medium mt-1">
            {acts.length} acts
            {tracking && onStageIndex >= 0 && (intermission ? <>, intermission</> : <>, act {acts[onStageIndex].number} on stage</>)}
            {ended && <>. The show has ended</>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => window.print()}
            aria-label="Print program"
            className="hidden sm:flex items-center justify-center w-11 h-11 bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 text-ink-500 shadow-sm hover:bg-ink-50 transition-colors"
          >
            <Printer size={16} />
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 sm:px-4 h-11 bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 text-brand-700 dark:text-brand-400 font-semibold text-sm shadow-sm hover:bg-brand-50 transition-colors"
          >
            {copied ? <><Check size={16} className="text-emerald-500" /> <span className="hidden sm:inline">Copied</span></> : <><Share2 size={16} /> <span className="hidden sm:inline">Share</span></>}
          </button>
        </div>
      </div>

      {ended && (
        <p className="px-4 py-3 rounded-card bg-ink-100 dark:bg-ink-800 text-sm text-ink-800 dark:text-ink-100">
          That&rsquo;s the show. Thanks for coming!
        </p>
      )}

      {preShow && !ended && (
        <p className="px-4 py-3 rounded-card bg-brand-50 dark:bg-brand-900/20 text-sm text-brand-900 dark:text-brand-100 flex items-center gap-2.5">
          <Heart size={14} fill="currentColor" className="text-brand-500 shrink-0" />
          <span className="flex-1">{preShow}</span>
          <Link to="/my-night" className="font-semibold underline shrink-0">My night</Link>
        </p>
      )}

      {/* Finished acts, folded */}
      {tracking && finishedBefore > 0 && (
        <button
          onClick={() => setShowFinished(v => !v)}
          aria-expanded={showFinished}
          className="w-full flex items-center justify-between px-4 h-11 rounded-card border border-dashed border-ink-300 dark:border-ink-700 text-sm text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 transition-colors print:hidden"
        >
          <span>{finishedBefore === 1 ? `Act ${acts[0].number} finished` : `Acts ${acts[0].number} to ${acts[finishedBefore - 1].number} finished`}</span>
          <span className="flex items-center gap-1 font-semibold">
            {showFinished ? 'Hide' : 'Show'}
            <ChevronDown size={15} className={clsx("transition-transform", showFinished && "rotate-180")} />
          </span>
        </button>
      )}

      {/* Running order */}
      {visible.length > 0 ? (
        <div className="space-y-2.5 sm:space-y-3 print-program">
          {visible.map(({ act, index }) => (
            <div key={act.number} className={clsx(tracking && index < finishedBefore && "opacity-60")}>
              {index === resumeIndex && (
                <p className="flex items-center gap-3 text-sm font-semibold text-stage-700 dark:text-stage-300 my-3" role="status">
                  <span className="h-px flex-1 bg-stage-300 dark:bg-stage-700" />
                  Intermission
                  <span className="h-px flex-1 bg-stage-300 dark:bg-stage-700" />
                </p>
              )}
              <ActCard
                act={act}
                isCurrent={tracking && !intermission && index === onStageIndex}
                scrollTarget={index === resumeIndex}
                aside={asideFor(index)}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                onClick={() => setSelectedAct(act)}
                showId={showId}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center py-10 px-6 rounded-card border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-600 dark:text-ink-300">
          The running order for this show hasn&rsquo;t been added yet.
        </p>
      )}

      <ActDetailModal
        act={selectedAct}
        isOpen={!!selectedAct}
        onClose={() => setSelectedAct(null)}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        isCurrent={selectedAct && currentAct?.isTracking && Number(currentAct.number) === Number(selectedAct.number)}
        showId={showId}
        acts={acts}
        onNavigate={setSelectedAct}
        currentAct={currentAct}
        actLog={actLog}
      />
    </div>
  );
}
