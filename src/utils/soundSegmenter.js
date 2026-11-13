// Listening assist: decide when one dance has ended and the next one's music
// has started, from a stream of loudness/tonality frames. No recognition of
// WHICH song — only the music → (quiet | applause) → new music pattern.
//
// Frames: { t: ms timestamp, rms: 0..1 loudness, flatness: 0..1 spectral
// flatness (≈0 tonal music, →1 noise such as applause) }.
// push() returns 'propose' exactly once per detected change, otherwise null.

export const DEFAULTS = {
  quietRms: 0.015,     // below this the room is quiet
  loudRms: 0.04,       // at or above this something is playing / clapping
  noiseFlatness: 0.4,  // loud + flat spectrum = applause/crowd, not music
  smoothMs: 1000,      // classify by majority over this window
  minActMs: 30000,     // an act runs at least this long before a break counts
  breakMs: 2500,       // non-music this long = the dance has ended
  onsetMs: 2000,       // music this long after a break = next dance started
};

export function classifyFrame(f, o = DEFAULTS) {
  if (f.rms < o.quietRms) return 'quiet';
  if (f.rms < o.loudRms) return 'low';
  return f.flatness >= o.noiseFlatness ? 'noise' : 'music';
}

export class SoundSegmenter {
  constructor(options = {}) {
    this.o = { ...DEFAULTS, ...options };
    this.window = [];
    this.reset(0);
  }

  // Call when the act changes for any reason (button, clicker, accepted
  // proposal) so the next proposal needs a full act's worth of music first.
  reset(t) {
    this.phase = 'act';        // 'act' (dance in progress) | 'break' (between dances)
    this.actStart = t;
    this.musicMs = 0;          // music heard during this act
    this.nonMusicSince = null; // start of the current non-music run
    this.musicSince = null;    // start of the current music run (during a break)
    this.lastT = t;
  }

  // Smoothed label for the current moment.
  label(t, raw) {
    this.window.push({ t, raw });
    while (this.window.length && this.window[0].t < t - this.o.smoothMs) this.window.shift();
    const counts = {};
    this.window.forEach(w => { counts[w.raw] = (counts[w.raw] || 0) + 1; });
    return (counts.music || 0) * 2 > this.window.length ? 'music' : (counts.noise || 0) >= (counts.quiet || 0) + (counts.low || 0) ? 'noise' : 'quiet';
  }

  push(frame) {
    const { t } = frame;
    const dt = Math.max(0, t - this.lastT);
    this.lastT = t;
    const kind = this.label(t, classifyFrame(frame, this.o));
    this.kind = kind;

    if (this.phase === 'act') {
      if (kind === 'music') {
        this.musicMs += dt;
        this.nonMusicSince = null;
      } else {
        if (this.nonMusicSince === null) this.nonMusicSince = t;
        const longEnough = t - this.actStart >= this.o.minActMs && this.musicMs >= this.o.minActMs / 2;
        if (longEnough && t - this.nonMusicSince >= this.o.breakMs) {
          this.phase = 'break';
          this.musicSince = null;
        }
      }
      return null;
    }

    // phase === 'break'
    if (kind === 'music') {
      if (this.musicSince === null) this.musicSince = t;
      if (t - this.musicSince >= this.o.onsetMs) {
        this.reset(t);
        return 'propose';
      }
    } else {
      this.musicSince = null;
    }
    return null;
  }
}
