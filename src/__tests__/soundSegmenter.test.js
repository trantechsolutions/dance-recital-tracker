import { describe, it, expect } from 'vitest';
import { SoundSegmenter, classifyFrame } from '../utils/soundSegmenter';

const MUSIC = { rms: 0.2, flatness: 0.1 };
const APPLAUSE = { rms: 0.2, flatness: 0.7 };
const QUIET = { rms: 0.005, flatness: 0.5 };

// Feed `ms` of a given sound at 100 ms frames; collect any events.
function feed(seg, state, sound, ms) {
  const events = [];
  for (let i = 0; i < ms; i += 100) {
    state.t += 100;
    const e = seg.push({ t: state.t, ...sound });
    if (e) events.push({ e, t: state.t });
  }
  return events;
}

describe('classifyFrame', () => {
  it('labels music, applause and silence', () => {
    expect(classifyFrame({ t: 0, ...MUSIC })).toBe('music');
    expect(classifyFrame({ t: 0, ...APPLAUSE })).toBe('noise');
    expect(classifyFrame({ t: 0, ...QUIET })).toBe('quiet');
  });
});

describe('SoundSegmenter', () => {
  it('proposes once after music → applause → new music', () => {
    const seg = new SoundSegmenter();
    const s = { t: 0 };
    expect(feed(seg, s, MUSIC, 120000)).toEqual([]);
    expect(feed(seg, s, APPLAUSE, 6000)).toEqual([]);
    const ev = feed(seg, s, MUSIC, 5000);
    expect(ev).toHaveLength(1);
    expect(ev[0].e).toBe('propose');
  });

  it('also works with silence between dances', () => {
    const seg = new SoundSegmenter();
    const s = { t: 0 };
    feed(seg, s, MUSIC, 60000);
    feed(seg, s, QUIET, 4000);
    expect(feed(seg, s, MUSIC, 4000)).toHaveLength(1);
  });

  it('ignores a short pause inside a dance', () => {
    const seg = new SoundSegmenter();
    const s = { t: 0 };
    feed(seg, s, MUSIC, 60000);
    feed(seg, s, QUIET, 1500); // dramatic pause, shorter than a break
    expect(feed(seg, s, MUSIC, 10000)).toEqual([]);
  });

  it('needs a full act of music before a break counts', () => {
    const seg = new SoundSegmenter();
    const s = { t: 0 };
    feed(seg, s, MUSIC, 10000);
    feed(seg, s, APPLAUSE, 5000);
    expect(feed(seg, s, MUSIC, 5000)).toEqual([]);
  });

  it('starts over after reset (a manual move)', () => {
    const seg = new SoundSegmenter();
    const s = { t: 0 };
    feed(seg, s, MUSIC, 60000);
    feed(seg, s, APPLAUSE, 5000);
    seg.reset(s.t); // runner pressed Next during the applause
    expect(feed(seg, s, MUSIC, 5000)).toEqual([]);
  });
});
