// Pure helpers for running a show: stepping through the running order,
// mapping clicker/keyboard input, and turning the act log into timings.

// Step by POSITION in the running order (act numbers can have gaps).
// dir: +1 next, -1 previous. Returns the target act, or null at either end.
export function stepAct(acts, currentNumber, dir) {
  if (!acts?.length) return null;
  const idx = acts.findIndex(a => Number(a.number) === Number(currentNumber));
  if (idx === -1) return dir > 0 ? acts[0] : null;
  return acts[idx + dir] || null;
}

// Presentation clickers send PageDown/PageUp (most) or arrows; a few send
// Space. Returns 'next' | 'prev' | null.
const NEXT_KEYS = new Set(['ArrowRight', 'PageDown', ' ', 'Spacebar']);
const PREV_KEYS = new Set(['ArrowLeft', 'PageUp']);

export function keyToCommand(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return null;
  if (NEXT_KEYS.has(event.key)) return 'next';
  if (PREV_KEYS.has(event.key)) return 'prev';
  return null;
}

// act_log entries are { number, at: ISO string }, appended on every move
// (including undo and jumps). For each act, use its LAST start and run until
// the next log entry after it. The act on stage has no end yet (ranMs null).
export function actTimings(log) {
  const entries = (log || [])
    .filter(e => e && e.at && e.number != null)
    .map(e => ({ number: Number(e.number), t: Date.parse(e.at) }))
    .filter(e => !Number.isNaN(e.t))
    .sort((a, b) => a.t - b.t);

  const out = {};
  entries.forEach((e, i) => {
    const next = entries[i + 1];
    out[e.number] = { startedAt: e.t, ranMs: next ? next.t - e.t : null };
  });
  return out;
}

// Typical act length today, for "about 20 min" estimates. Median of finished
// acts, ignoring slips (< 30 s, e.g. a mistaken Next) and breaks (> 15 min,
// e.g. an intermission). Null until at least 3 acts have been timed.
export function typicalActMs(log) {
  const ran = Object.values(actTimings(log))
    .map(t => t.ranMs)
    .filter(ms => ms != null && ms >= 30000 && ms <= 15 * 60000)
    .sort((a, b) => a - b);
  if (ran.length < 3) return null;
  const mid = Math.floor(ran.length / 2);
  return ran.length % 2 ? ran[mid] : (ran[mid - 1] + ran[mid]) / 2;
}

// "about 20 min" for N acts away, or null when there's no estimate yet.
export function minutesAway(actsAway, typicalMs) {
  if (!typicalMs || !actsAway || actsAway < 1) return null;
  const mins = Math.max(1, Math.round((actsAway * typicalMs) / 60000));
  return `about ${mins} min`;
}

// 3:41 / 1:02:05
export function formatDuration(ms) {
  if (ms == null || ms < 0) return '';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

// 12:50
export function formatClock(ms) {
  if (ms == null) return '';
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '');
}

// Dancers who appear in two consecutive acts — no time for a costume change.
// Returns [{ dancer, from: actNumber, to: actNumber }].
export function backToBackDancers(acts) {
  const out = [];
  (acts || []).forEach((act, i) => {
    const next = acts[i + 1];
    if (!next) return;
    const here = new Set(act.performers || []);
    (next.performers || []).forEach(p => {
      if (here.has(p)) out.push({ dancer: p, from: act.number, to: next.number });
    });
  });
  return out;
}
