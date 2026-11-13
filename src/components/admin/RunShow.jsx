import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useListeningAssist } from '../../hooks/useListeningAssist';
import { stepAct, keyToCommand, actTimings, formatDuration, formatClock } from '../../utils/showControl';

const UNDO_MS = 8000;
const COUNTDOWN_MS = 5000;
const MODE_KEY = 'listeningAssistMode';
// A second Next/Back within this window is treated as an accidental double tap.
const DOUBLE_TAP_MS = 1500;

const readMode = () => {
  try { return localStorage.getItem(MODE_KEY) || 'off'; } catch { return 'off'; }
};

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

// Show-day controller for admins and show runners. Phone: one big Next button
// in the thumb zone. Laptop (lg+): running order with real start/run times,
// controls in the middle, listening assist on the right.
export default function RunShow({ recitalData, currentAct, actLog, updateActNumber, setShowPhase, selectedShow, setSelectedShow }) {
  const { showId } = useParams();
  const { canRunShow } = useApp();
  const show = recitalData?.[showId];
  const acts = useMemo(() => show?.acts || [], [show]);
  const now = useNow(250);

  // The live tracker follows App's selected show — point it at this one.
  useEffect(() => {
    if (show && selectedShow !== showId) setSelectedShow(showId);
  }, [show, showId, selectedShow, setSelectedShow]);
  const ready = selectedShow === showId;

  const tracking = ready && !!currentAct?.isTracking;
  const intermission = tracking && currentAct?.phase === 'intermission';
  const ended = ready && !tracking && currentAct?.phase === 'ended';
  const onStage = ready ? acts.find(a => Number(a.number) === Number(currentAct?.number)) : null;
  const next = tracking ? stepAct(acts, currentAct.number, 1) : null;
  const prev = tracking ? stepAct(acts, currentAct.number, -1) : null;
  const onStageIndex = onStage ? acts.indexOf(onStage) : -1;
  const timings = useMemo(() => actTimings(actLog), [actLog]);
  const elapsed = currentAct?.startedAt ? now - Date.parse(currentAct.startedAt) : null;

  // --- Moving between acts (every path goes through move) ---
  const [undo, setUndo] = useState(null);       // { from, to, until }
  const [proposal, setProposal] = useState(null); // { to, deadline|null }
  const [mode, setModeState] = useState(readMode);
  const [lastKeyAt, setLastKeyAt] = useState(null);
  const assistResetRef = useRef(() => {});
  const lastMoveAt = useRef(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  // A proposal only counts while its act is still the next one.
  const activeProposal = proposal && next && proposal.to.number === next.number ? proposal : null;

  const setMode = (m) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* private mode */ }
  };

  const move = useCallback(async (target, { recordUndo = true } = {}) => {
    if (!target) return;
    const from = currentAct?.number;
    setProposal(null);
    setConfirmEnd(false);
    assistResetRef.current();
    lastMoveAt.current = Date.now();
    await updateActNumber(target.number);
    if (recordUndo && from != null && Number(from) !== Number(target.number)) {
      setUndo({ from, to: target.number, until: Date.now() + UNDO_MS });
    }
  }, [currentAct?.number, updateActNumber]);

  const tooSoon = () => Date.now() - lastMoveAt.current < DOUBLE_TAP_MS;
  const goNext = useCallback(() => {
    if (!tracking || tooSoon()) return;
    move(next);
  }, [tracking, next, move]);
  const goPrev = useCallback(() => {
    if (!tracking || tooSoon()) return;
    move(prev);
  }, [tracking, prev, move]);

  const startIntermission = () => { setProposal(null); setShowPhase('intermission'); };
  const endShow = () => { setConfirmEnd(false); setProposal(null); setUndo(null); setShowPhase('ended'); };

  const startShow = () => {
    const first = acts.find(a => Number(a.number) === Number(currentAct?.number)) || acts[0];
    if (first) move(first, { recordUndo: false });
  };

  const doUndo = () => {
    if (!undo) return;
    const target = acts.find(a => Number(a.number) === Number(undo.from));
    setUndo(null);
    move(target, { recordUndo: false });
  };

  // Clicker / keyboard
  useEffect(() => {
    const onKey = (e) => {
      const cmd = keyToCommand(e);
      if (!cmd) return;
      e.preventDefault();
      setLastKeyAt(Date.now());
      if (activeProposal && cmd === 'next') { move(activeProposal.to); return; }
      if (cmd === 'next') goNext(); else goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, activeProposal, move]);

  // Listening assist
  const onPropose = useCallback(() => {
    if (!next) return;
    setProposal({ to: next, deadline: mode === 'auto' ? Date.now() + COUNTDOWN_MS : null });
  }, [next, mode]);
  const assist = useListeningAssist({ enabled: tracking && mode !== 'off', onPropose });
  useEffect(() => { assistResetRef.current = assist.reset; }, [assist.reset]);

  // Countdown and undo expiry (timers, so state changes happen in callbacks)
  useEffect(() => {
    if (!activeProposal?.deadline) return;
    const t = setTimeout(() => move(activeProposal.to), Math.max(0, activeProposal.deadline - Date.now()));
    return () => clearTimeout(t);
  }, [activeProposal, move]);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), Math.max(0, undo.until - Date.now()));
    return () => clearTimeout(t);
  }, [undo]);

  if (recitalData && !show) return <Navigate to="/admin" replace />;
  if (!canRunShow(showId)) return <Navigate to="/" replace />;
  if (!show) return null;

  const countdown = activeProposal?.deadline ? Math.max(0, Math.ceil((activeProposal.deadline - now) / 1000)) : null;
  const clickerWorking = lastKeyAt && now - lastKeyAt < 60000;

  return (
    <div className="fixed inset-0 z-[200] bg-ink-950 text-ink-50 overflow-y-auto">
      <div className="min-h-full lg:h-full lg:grid lg:grid-cols-[minmax(280px,340px)_1fr_minmax(260px,320px)]">

        {/* Running order with real times (laptop) */}
        <aside className="hidden lg:flex flex-col border-r border-ink-800 p-5 min-h-0">
          <h2 className="text-sm font-semibold text-ink-400 mb-3">Running order</h2>
          <div className="grid grid-cols-[2.25rem_1fr_3.25rem_3rem] gap-2 text-[11px] text-ink-400 pb-2 border-b border-ink-800">
            <span>#</span><span>Act</span><span>Started</span><span>Ran</span>
          </div>
          <ol className="flex-1 overflow-y-auto -mx-2 mt-1">
            {acts.map((act, i) => {
              const t = timings[act.number];
              const isNow = i === onStageIndex && tracking;
              const done = tracking && onStageIndex >= 0 && i < onStageIndex;
              return (
                <li key={act.number}>
                  <button
                    onClick={() => move(act)}
                    disabled={!tracking}
                    className={clsx(
                      "w-full grid grid-cols-[2.25rem_1fr_3.25rem_3rem] gap-2 items-center text-left text-sm px-2 py-2 rounded-md transition-colors",
                      isNow ? "bg-stage-400 text-ink-900 font-semibold" : done ? "text-ink-500 hover:bg-ink-900" : "text-ink-100 hover:bg-ink-900",
                      !tracking && "cursor-default"
                    )}
                  >
                    <span className="tabular-nums">{act.number}</span>
                    <span className="truncate">{act.title}</span>
                    <span className="tabular-nums">{t ? formatClock(t.startedAt) : ''}</span>
                    <span className="tabular-nums">{t ? formatDuration(isNow ? elapsed : t.ranMs) : ''}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-ink-400 mt-3">Click any act to jump to it.</p>
        </aside>

        {/* On stage + controls */}
        <main className="flex flex-col p-4 sm:p-6 lg:p-10 gap-5 min-h-[100dvh] lg:min-h-0">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link to="/admin" aria-label="Back to admin" className="w-11 h-11 -ml-2 flex items-center justify-center rounded-card text-ink-300 hover:bg-ink-900">
                <ArrowLeft size={20} />
              </Link>
              <div className="min-w-0">
                <p className="text-xs text-ink-400 truncate">{show.label}</p>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <span className={clsx("w-2 h-2 rounded-full", tracking ? "bg-stage-400" : "bg-ink-600")} />
                  {tracking ? 'Live to parents' : 'Not live'}
                </p>
              </div>
            </div>
            {tracking && (
              <div className="flex gap-2">
                {!intermission && next && (
                  <button onClick={startIntermission} className="h-11 px-4 rounded-card border border-ink-700 text-sm hover:bg-ink-900">
                    Intermission
                  </button>
                )}
                <button onClick={() => setConfirmEnd(true)} className="h-11 px-4 rounded-card border border-ink-700 text-sm hover:bg-ink-900">
                  End show
                </button>
              </div>
            )}
          </header>

          {/* Phone: what's helping right now, linking to the settings below */}
          <button
            type="button"
            onClick={() => document.getElementById('run-settings')?.scrollIntoView({ behavior: 'smooth' })}
            className="lg:hidden flex flex-wrap gap-2 text-left"
            aria-label="Listening assist and clicker settings"
          >
            <span className="px-3 py-1.5 rounded-pill bg-ink-900 border border-ink-700 text-xs">
              {mode === 'off' ? 'Listening assist: off'
                : !tracking ? 'Listening assist: starts with the show'
                : assist.status === 'error' ? 'Listening assist: microphone blocked'
                : assist.status === 'listening'
                  ? (assist.kind === 'music' ? 'Listening: hearing music' : assist.kind === 'noise' ? 'Listening: hearing applause' : 'Listening: quiet')
                : 'Listening assist: starting'}
            </span>
            <span className="px-3 py-1.5 rounded-pill bg-ink-900 border border-ink-700 text-xs">
              {clickerWorking ? 'Clicker: working' : 'Clicker: not tested'}
            </span>
          </button>

          {!tracking ? (
            <div className="flex-1 flex flex-col justify-center gap-6">
              <div>
                <p className="text-ink-400 text-sm mb-2">{acts.length} acts</p>
                <h1 className="font-display text-4xl sm:text-5xl font-medium leading-tight">
                  {ended ? 'The show has ended.' : ready && currentAct?.startedAt ? 'The show is paused.' : 'Ready when the curtain goes up.'}
                </h1>
                <p className="text-ink-300 mt-3 max-w-md">
                  {ended ? 'Parents see that the show is over. Start again only if it ended by mistake.' : 'Starting shows parents which act is on stage.'} It {ended ? 'restarts' : 'begins'} at act {(acts.find(a => Number(a.number) === Number(currentAct?.number)) || acts[0])?.number ?? 1}.
                </p>
              </div>
              <button
                onClick={startShow}
                disabled={!ready || acts.length === 0}
                className="h-24 rounded-2xl bg-stage-400 text-ink-900 text-2xl font-semibold hover:bg-stage-300 active:scale-[0.99] transition disabled:opacity-40"
              >
                {ready && currentAct?.startedAt ? 'Resume the show' : 'Start the show'}
              </button>
            </div>
          ) : intermission ? (
            <div className="flex-1 flex flex-col justify-center gap-6">
              <div aria-live="polite">
                <p className="text-sm font-semibold text-stage-300">After act {onStage?.number ?? currentAct.number}</p>
                <h1 className="font-display text-5xl font-medium mt-1">Intermission</h1>
                <p className="text-ink-300 mt-3 max-w-md">
                  Parents see the break and keep their countdowns. {next ? `Act ${next.number}, ${next.title}, opens the second half.` : ''}
                </p>
              </div>
              {next && (
                <button
                  onClick={() => move(next)}
                  className="h-28 rounded-2xl bg-stage-400 text-ink-900 hover:bg-stage-300 active:scale-[0.99] transition flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-2xl font-semibold">Start the second half</span>
                  <span className="font-display italic text-lg">{next.number} {next.title}</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <section aria-live="polite" className="pt-2 lg:pt-10">
                <p className="text-sm font-semibold text-stage-300">
                  On stage{elapsed != null ? ` for ${formatDuration(elapsed)}` : ''}
                </p>
                <div className="flex items-baseline gap-4 lg:gap-6 mt-1">
                  <span className="font-display font-black text-[88px] lg:text-[160px] leading-[0.85] text-stage-300 tabular-nums">{onStage?.number ?? currentAct.number}</span>
                  <span className="font-display italic text-3xl lg:text-5xl leading-tight">{onStage?.title ?? currentAct.title}</span>
                </div>
                <p className="text-sm text-ink-400 mt-2">Act {onStageIndex + 1} of {acts.length}</p>
              </section>

              {/* Up next / on deck (phone) */}
              <ol className="lg:hidden border-t border-ink-800">
                {[next, next && stepAct(acts, next.number, 1)].filter(Boolean).map((a, i) => (
                  <li key={a.number} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 h-12 border-b border-ink-800">
                    <span className="font-display text-lg text-ink-400">{a.number}</span>
                    <span className="font-display italic text-lg truncate">{a.title}</span>
                    <span className="text-xs text-ink-400">{i === 0 ? 'Up next' : 'On deck'}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-auto flex flex-col gap-3">
                {undo && (
                  <div role="status" className="flex items-center justify-between h-12 pl-4 pr-1 rounded-card bg-ink-900 border border-ink-700 text-sm">
                    <span>Moved to act {undo.to}</span>
                    <button onClick={doUndo} className="h-10 px-4 rounded-md font-semibold text-stage-300 hover:bg-ink-800">Undo</button>
                  </div>
                )}

                <div className="grid lg:grid-cols-[1fr_2fr] gap-3">
                  <button
                    onClick={goPrev}
                    disabled={!prev}
                    className="hidden lg:flex h-32 flex-col items-center justify-center gap-1 rounded-2xl border border-ink-700 hover:bg-ink-900 disabled:opacity-30"
                  >
                    <span className="text-lg font-semibold">Back</span>
                    <span className="text-xs text-ink-400">Left arrow or Page Up</span>
                  </button>
                  <button
                    onClick={next ? goNext : () => setConfirmEnd(true)}
                    className="h-40 lg:h-32 flex flex-col items-center justify-center gap-1 rounded-2xl bg-stage-400 text-ink-900 hover:bg-stage-300 active:scale-[0.99] transition"
                  >
                    <span className="text-3xl lg:text-2xl font-semibold">{next ? 'Next act' : 'End the show'}</span>
                    {next && <span className="font-display italic text-lg">{next.number} {next.title}</span>}
                    <span className="hidden lg:block text-xs">Space, right arrow, Page Down or clicker</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:hidden">
                  <button onClick={goPrev} disabled={!prev} className="h-11 rounded-card border border-ink-700 text-sm disabled:opacity-30">
                    Back one act
                  </button>
                  <label className="relative h-11 rounded-card border border-ink-700 text-sm flex items-center justify-center">
                    <span>Jump to act…</span>
                    <select
                      aria-label="Jump to act"
                      value=""
                      onChange={(e) => move(acts.find(a => String(a.number) === e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    >
                      <option value="" disabled>Jump to act…</option>
                      {acts.map(a => <option key={a.number} value={a.number}>{a.number} {a.title}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Moving to the next act: assist + devices */}
        <aside id="run-settings" className="border-t lg:border-t-0 lg:border-l border-ink-800 p-4 sm:p-6 lg:p-5 flex flex-col gap-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold mb-2">Listening assist</legend>
            {[
              ['off', 'Off, I’ll press Next'],
              ['ask', 'Ask me when new music starts'],
              ['auto', 'Move after a 5-second countdown'],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-3 text-sm min-h-[36px] cursor-pointer">
                <input type="radio" name="assist-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="w-4 h-4 accent-amber-400" />
                {label}
              </label>
            ))}
            <p className="text-xs text-ink-400 leading-relaxed">
              Listens for the music to stop and new music to start. Sound is checked on this device and never recorded. Keep this screen open.
            </p>
          </fieldset>

          {mode !== 'off' && (
            <div className="space-y-1.5">
              <p className="text-xs text-ink-400">
                {!tracking ? 'Starts listening when the show is live.'
                  : assist.status === 'error' ? assist.error
                  : assist.status === 'starting' ? 'Starting the microphone…'
                  : 'Room sound'}
              </p>
              {tracking && assist.status === 'listening' && (
                <>
                  <div aria-hidden="true" className="h-2.5 rounded-full bg-ink-800 overflow-hidden">
                    <div className="h-full bg-ink-400 transition-[width] duration-100" style={{ width: `${Math.round(assist.level * 100)}%` }} />
                  </div>
                  <p className="text-xs text-ink-300">
                    {assist.kind === 'music' ? 'Hearing music' : assist.kind === 'noise' ? 'Hearing applause or talking' : 'Quiet'}
                  </p>
                </>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-ink-800 space-y-2 text-sm">
            <p className="font-semibold">Clicker or keyboard</p>
            <p className="text-ink-300">
              {clickerWorking ? 'Working. Press Next on it to move on.' : 'Press any button on a presentation clicker to test it.'}
            </p>
          </div>
        </aside>
      </div>

      {confirmEnd && (
        <div role="alertdialog" aria-label="End the show?" className="fixed inset-x-3 bottom-6 lg:left-auto lg:right-6 lg:w-[420px] z-[220] rounded-2xl border-2 border-ink-500 bg-ink-900 p-5 shadow-2xl space-y-4">
          <div>
            <p className="text-lg font-semibold">End the show for everyone?</p>
            <p className="text-sm text-ink-300 mt-1">Parents see “That’s the show” and the countdowns stop.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setConfirmEnd(false)} className="h-12 rounded-card border border-ink-600 font-semibold text-sm hover:bg-ink-800">Keep going</button>
            <button onClick={endShow} className="h-12 rounded-card bg-white text-ink-900 font-semibold text-sm hover:bg-ink-100">End the show</button>
          </div>
        </div>
      )}

      {/* Listening assist proposal */}
      {activeProposal && (
        <div role="alertdialog" aria-label={`Move to act ${activeProposal.to.number}?`} className="fixed inset-x-3 bottom-6 lg:left-auto lg:right-6 lg:w-[420px] z-[210] rounded-2xl border-2 border-stage-400 bg-ink-900 p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-4">
            {countdown != null && (
              <span className="w-14 h-14 shrink-0 rounded-full border-4 border-stage-400 flex items-center justify-center text-2xl font-semibold tabular-nums">{countdown}</span>
            )}
            <div>
              <p className="text-sm text-ink-400">New music started</p>
              <p className="text-lg font-semibold">Move to act {activeProposal.to.number}?</p>
              <p className="font-display italic text-lg">{activeProposal.to.title}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setProposal(null); assist.reset(); }} className="h-12 rounded-card border border-ink-600 font-semibold text-sm hover:bg-ink-800">
              Stay on {currentAct.number}
            </button>
            <button onClick={() => move(activeProposal.to)} className="h-12 rounded-card bg-stage-400 text-ink-900 font-semibold text-sm hover:bg-stage-300">
              Move now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
