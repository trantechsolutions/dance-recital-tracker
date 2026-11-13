import React, { useMemo, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Heart, Star, Pencil, Check, CloudUpload } from 'lucide-react';
import { getLiveStatus, whoLabel } from '../../utils/liveProgress';
import { typicalActMs, minutesAway } from '../../utils/showControl';
import AlertsToggle from '../ui/AlertsToggle';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { displayName } from '../../utils/names';

// Per-dancer-per-act note key. Keyed by the act's stable `id` so notes stay
// attached to the dance across reorders/renumbering. Acts saved before stable
// ids existed have no `id` yet; they fall back to `#<number>` until the show is
// next saved (which backfills the id) — at which point any note on a legacy act
// re-keys. The dancer half is still the name, matching favorites, so renaming a
// performer still moves their note.
const dancerNoteKey = (showId, act, dancer) =>
  `${showId || 'show'}::${act.id || `#${act.number}`}::${dancer}`;

// A favorited dancer chip with an inline, editable private note.
function DancerNote({ dancer, note, isCurrent, onSave }) {
  const { canViewFullNames } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note || '');
  const cancelling = useRef(false);

  const startEditing = () => { setDraft(note || ''); setEditing(true); };
  const shownName = displayName(dancer, canViewFullNames);

  const commit = () => {
    if (cancelling.current) { cancelling.current = false; return; }
    setEditing(false);
    if (draft.trim() !== (note || '')) onSave(draft);
  };

  const cancel = () => {
    cancelling.current = true;
    setDraft(note || '');
    setEditing(false);
  };

  return (
    <div className={clsx(
      "rounded-lg px-2.5 py-1.5",
      isCurrent ? "bg-white/20" : "bg-brand-50 dark:bg-brand-900/20"
    )}>
      <div className="flex items-center gap-1.5">
        <Heart
          size={11}
          fill="currentColor"
          className={isCurrent ? "text-white" : "text-brand-500 dark:text-brand-400"}
        />
        <span className={clsx(
          "text-xs font-bold",
          isCurrent ? "text-white" : "text-brand-600 dark:text-brand-400"
        )}>
          {shownName}
        </span>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            aria-label={note ? `Edit note for ${shownName}` : `Add note for ${shownName}`}
            className={clsx(
              "ml-auto inline-flex items-center gap-1 text-[10px] font-semibold transition-colors",
              isCurrent
                ? "text-white/70 hover:text-white"
                : "text-ink-400 hover:text-brand-600 dark:hover:text-brand-300"
            )}
          >
            <Pencil size={11} />
            {!note && <span>Note</span>}
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5 mt-1.5">
          <input
            type="text"
            autoFocus
            value={draft}
            maxLength={500}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commit(); }
              else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
            }}
            onBlur={commit}
            placeholder="Outfit, hairstyle, props…"
            className={clsx(
              "flex-1 min-w-0 px-2 py-1 text-[11px] rounded-md border focus:outline-none focus:ring-2 transition-all",
              isCurrent
                ? "bg-white/90 border-white/40 text-ink-800 placeholder-ink-400 focus:ring-white/40"
                : "bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-700 dark:text-white placeholder-ink-400 focus:ring-brand-500/30 focus:border-brand-500"
            )}
          />
          {/* onMouseDown (not onClick) so it fires before the input's onBlur */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); commit(); }}
            aria-label="Save note"
            className={clsx(
              "shrink-0 p-1 rounded-md transition-colors",
              isCurrent
                ? "text-white hover:bg-white/20"
                : "text-brand-600 hover:bg-brand-100 dark:hover:bg-brand-900/40"
            )}
          >
            <Check size={13} />
          </button>
        </div>
      ) : note ? (
        <p className={clsx(
          "text-[11px] leading-snug mt-0.5 whitespace-pre-wrap break-words",
          isCurrent ? "text-white/80" : "text-ink-500 dark:text-ink-400"
        )}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

// Offer to sync device-local favorites/notes into the account. Shown only when
// logged in with un-synced guest data; opens the same modal as the login prompt.
function SyncBanner() {
  const { user, guestDataPresent, openSyncPrompt } = useApp();
  if (!user || !guestDataPresent) return null;

  return (
    <button
      onClick={openSyncPrompt}
      className="w-full flex items-center gap-3 px-4 py-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-card text-left hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
    >
      <CloudUpload size={20} className="text-brand-600 shrink-0" />
      <span className="flex-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
        Saved items on this device aren't in your account yet
      </span>
      <span className="text-xs font-bold text-brand-600 uppercase tracking-wide shrink-0">Sync</span>
    </button>
  );
}

// The big sentence at the top of My night: when is my dancer on?
function headline(status, nameFn, eta) {
  const { phase, target, actsAway, headBackAfter, myActs } = status;
  if (status.ended) return { title: 'That’s the show.', sub: 'Thanks for cheering them on.' };
  if (phase === 'done') {
    return { title: 'All of your acts are done.', sub: 'Thanks for cheering them on.' };
  }
  if (!target) return null;
  const { who, plural } = whoLabel(target, nameFn);
  const is = plural ? 'are' : 'is';
  const actLine = `Act ${target.number}, ${target.title}.`;
  switch (phase) {
    case 'onstage': return { title: `${who} ${is} on stage.`, sub: actLine };
    case 'next':    return { title: `${who} ${is} up next.`, sub: `Head to your seat now. ${actLine}` };
    case 'soon':    return { title: `${who} ${is} on in 2 acts.`, sub: `${eta ? `That’s ${eta}. ` : ''}Head to your seat now. ${actLine}` };
    case 'later':   return { title: `${who} ${is} on in ${actsAway} acts.`, sub: `${eta ? `That’s ${eta}. ` : ''}Head back after act ${headBackAfter.number}. ${actLine}` };
    default: {
      // Not tracking yet (before curtain or intermission).
      const n = myActs.length;
      return {
        title: `${who} ${is} first on in act ${target.number}.`,
        sub: `${n} of your act${n !== 1 ? 's are' : ' is'} in this show. The countdown starts when the show does.`,
      };
    }
  }
}

export default function MyScheduleView({ showData, currentAct, actLog, showId }) {
  const { favorites, toggleFavorite, dancerNotes, setDancerNote, canViewFullNames } = useApp();
  const nameFn = (n) => displayName(n, canViewFullNames);

  const status = useMemo(
    () => getLiveStatus(showData, currentAct, favorites, showId),
    [showData, currentAct, favorites, showId]
  );
  const schedule = status.myActs;

  if (!showData) {
    return (
      <div className="text-center py-16 px-6 bg-white dark:bg-ink-800 rounded-card border border-ink-100 dark:border-ink-700">
        <p className="font-display text-xl dark:text-white mb-1">Choose your show</p>
        <p className="text-sm text-ink-500 dark:text-ink-400">Pick the show on your ticket from the list above.</p>
      </div>
    );
  }

  if (schedule.length === 0) {
    return (
      <div className="space-y-4 animate-in fade-in">
        <SyncBanner />
        <section className="py-10 px-1 space-y-4">
          <h2 className="font-display text-4xl sm:text-5xl font-medium leading-[1.05] tracking-tight dark:text-white">
            Who are you here to see?
          </h2>
          <p className="text-ink-600 dark:text-ink-300 max-w-md">
            Follow your dancer and this page tells you when they're on and when to head back to your seat.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/search?tab=dancers"
              className="inline-flex items-center h-11 px-5 bg-brand-600 text-white rounded-card font-semibold text-sm hover:bg-brand-700 transition-colors"
            >
              Find your dancer
            </Link>
            <Link
              to="/"
              className="inline-flex items-center h-11 px-5 bg-ink-100 dark:bg-ink-700 text-ink-800 dark:text-white rounded-card font-semibold text-sm hover:bg-ink-200 dark:hover:bg-ink-600 transition-colors"
            >
              Browse the program
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const head = headline(status, nameFn, minutesAway(status.actsAway, typicalActMs(actLog)));
  const live = status.tracking && status.onStageIndex >= 0;
  const nextIndex = status.target?.index;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in">
      <SyncBanner />

      {/* The one answer parents need */}
      {head && (
        <section className="pt-2 px-1 space-y-3" aria-live="polite">
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {status.intermission ? 'Intermission' : live ? `Act ${status.onStage.number} is on stage` : showData.label}
          </p>
          <h2 className={clsx(
            "font-display text-4xl sm:text-6xl font-medium leading-[1.04] tracking-tight",
            status.phase === 'onstage' ? "text-brand-700 dark:text-brand-300"
              : (status.phase === 'next' || status.phase === 'soon') ? "text-stage-700 dark:text-stage-300"
              : "text-ink-900 dark:text-white"
          )}>
            {head.title}
          </h2>
          <p className="text-base text-ink-700 dark:text-ink-300 max-w-lg">{head.sub}</p>
        </section>
      )}

      {/* Your acts, as checkpoints */}
      <ol className="relative ml-2 pl-7 border-l-2 border-ink-200 dark:border-ink-700 space-y-5">
        {schedule.map((act) => {
          const isCurrent = live && !status.intermission && act.index === status.onStageIndex;
          const isPast = (live && (act.index < status.onStageIndex || (status.intermission && act.index === status.onStageIndex))) || status.ended;
          const isNext = live && act.index === nextIndex && !isCurrent;
          const away = live && act.index > status.onStageIndex ? act.index - status.onStageIndex : null;
          const emphasis = isCurrent || isNext;

          const label = isCurrent ? `Act ${act.number}, on stage now`
            : isPast ? `Act ${act.number}, done`
            : isNext ? `Act ${act.number}, next for you, in ${away} act${away !== 1 ? 's' : ''}`
            : away ? `Act ${act.number}, in ${away} acts`
            : `Act ${act.number}`;

          return (
            <li key={act.number} className="relative">
              <span
                aria-hidden="true"
                className={clsx(
                  "absolute rounded-full",
                  emphasis
                    ? "-left-[2.3rem] top-0.5 w-[1.1rem] h-[1.1rem] bg-brand-600 ring-4 ring-brand-100 dark:ring-brand-900/60"
                    : isPast
                      ? "-left-[2.1rem] top-1 w-3.5 h-3.5 bg-ink-300 dark:bg-ink-600"
                      : "-left-[2.1rem] top-1 w-3.5 h-3.5 bg-ink-50 dark:bg-ink-900 border-2 border-ink-300 dark:border-ink-600"
                )}
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={clsx(
                    "text-xs font-semibold",
                    emphasis ? "text-brand-700 dark:text-brand-300" : "text-ink-500 dark:text-ink-400"
                  )}>
                    {label}
                  </p>
                  <p className={clsx(
                    "font-display italic leading-snug",
                    emphasis ? "text-2xl" : "text-lg",
                    isPast ? "text-ink-400 dark:text-ink-500 line-through" : "text-ink-900 dark:text-white"
                  )}>
                    {act.title}
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(act.actKey)}
                  aria-label={act.isActFav ? 'Saved. Tap to unsave this act' : 'Save this act'}
                  aria-pressed={!!act.isActFav}
                  className="w-11 h-11 -mt-1.5 rounded-card flex items-center justify-center text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors shrink-0"
                >
                  <Star size={18} fill={act.isActFav ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Followed dancers — each with an editable private note */}
              {act.favoritedDancers.length > 0 && !isPast && (
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2 max-w-xl">
                  {act.favoritedDancers.map(dancer => {
                    const key = dancerNoteKey(showId, act, dancer);
                    return (
                      <DancerNote
                        key={dancer}
                        dancer={dancer}
                        note={dancerNotes?.[key] || ''}
                        isCurrent={false}
                        onSave={(text) => setDancerNote(key, text)}
                      />
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!status.ended && <AlertsToggle variant="card" who={status.target ? whoLabel(status.target, nameFn).who.replace(/^Your act$/, 'your act') : 'your dancer'} />}

      <div className="flex items-center justify-between gap-3 p-4 rounded-card border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800">
        <div>
          <p className="text-sm font-semibold dark:text-white">
            {schedule.length} of your act{schedule.length !== 1 ? 's' : ''} in this show
          </p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Add a sibling or a friend's dancer</p>
        </div>
        <Link
          to="/search?tab=dancers"
          className="shrink-0 inline-flex items-center h-11 px-4 border border-ink-800 dark:border-ink-300 rounded-card text-sm font-semibold text-ink-900 dark:text-white hover:bg-ink-50 dark:hover:bg-ink-700 transition-colors"
        >
          Add dancer
        </Link>
      </div>
    </div>
  );
}
