import { describe, it, expect } from 'vitest';
import { stepAct, keyToCommand, actTimings, formatDuration, backToBackDancers, typicalActMs, minutesAway } from '../utils/showControl';

const acts = [{ number: 1 }, { number: 2 }, { number: 4 }];

describe('stepAct', () => {
  it('steps by position across numbering gaps', () => {
    expect(stepAct(acts, 2, 1).number).toBe(4);
    expect(stepAct(acts, 4, -1).number).toBe(2);
  });
  it('returns null past either end', () => {
    expect(stepAct(acts, 4, 1)).toBeNull();
    expect(stepAct(acts, 1, -1)).toBeNull();
  });
  it('starts at the first act when the current number is unknown', () => {
    expect(stepAct(acts, 99, 1).number).toBe(1);
  });
});

describe('keyToCommand', () => {
  const ev = (key, extra = {}) => ({ key, target: { tagName: 'BODY' }, ...extra });
  it('maps clicker and arrow keys', () => {
    expect(keyToCommand(ev('PageDown'))).toBe('next');
    expect(keyToCommand(ev('ArrowRight'))).toBe('next');
    expect(keyToCommand(ev(' '))).toBe('next');
    expect(keyToCommand(ev('PageUp'))).toBe('prev');
    expect(keyToCommand(ev('ArrowLeft'))).toBe('prev');
  });
  it('ignores typing and modified keys', () => {
    expect(keyToCommand(ev(' ', { target: { tagName: 'INPUT' } }))).toBeNull();
    expect(keyToCommand(ev('ArrowRight', { ctrlKey: true }))).toBeNull();
    expect(keyToCommand(ev('a'))).toBeNull();
  });
});

describe('actTimings', () => {
  it('uses each act’s last start and the following entry as its end', () => {
    const t = actTimings([
      { number: 1, at: '2026-06-27T12:00:00Z' },
      { number: 2, at: '2026-06-27T12:03:00Z' },
      { number: 3, at: '2026-06-27T12:04:00Z' }, // mistaken advance
      { number: 2, at: '2026-06-27T12:04:05Z' }, // undo
      { number: 3, at: '2026-06-27T12:07:05Z' },
    ]);
    expect(t[1].ranMs).toBe(180000);
    expect(t[2].startedAt).toBe(Date.parse('2026-06-27T12:04:05Z'));
    expect(t[2].ranMs).toBe(180000);
    expect(t[3].ranMs).toBeNull();
  });
  it('tolerates empty or bad input', () => {
    expect(actTimings(undefined)).toEqual({});
    expect(actTimings([{ number: 1, at: 'nope' }])).toEqual({});
  });
});

describe('typicalActMs / minutesAway', () => {
  const at = (min) => new Date(Date.UTC(2026, 5, 27, 12, 0) + min * 60000).toISOString();
  it('needs three timed acts', () => {
    expect(typicalActMs([{ number: 1, at: at(0) }, { number: 2, at: at(4) }, { number: 3, at: at(8) }])).toBeNull();
  });
  it('uses the median and ignores slips and breaks', () => {
    const log = [
      { number: 1, at: at(0) },
      { number: 2, at: at(4) },      // 4 min
      { number: 3, at: at(7) },      // 3 min
      { number: 4, at: at(7.2) },    // 12 s slip, ignored
      { number: 5, at: at(12.2) },   // 5 min
      { number: 6, at: at(37.2) },   // 25 min intermission, ignored
      { number: 7, at: at(40) },
    ];
    // kept: 4, 3, 5 and 2.8 min → median 3.5 min
    expect(typicalActMs(log)).toBe(3.5 * 60000);
    expect(minutesAway(5, 4 * 60000)).toBe('about 20 min');
    expect(minutesAway(5, null)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(221000)).toBe('3:41');
    expect(formatDuration(3725000)).toBe('1:02:05');
    expect(formatDuration(null)).toBe('');
  });
});

describe('backToBackDancers', () => {
  it('finds dancers in consecutive acts only', () => {
    const r = backToBackDancers([
      { number: 1, performers: ['Ava K.', 'Mia T.'] },
      { number: 2, performers: ['Ava K.'] },
      { number: 3, performers: ['Mia T.'] },
    ]);
    expect(r).toEqual([{ dancer: 'Ava K.', from: 1, to: 2 }]);
  });
});
