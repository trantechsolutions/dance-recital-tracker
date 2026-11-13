import { describe, it, expect } from 'vitest';
import { alertStage } from '../utils/alerts';

const st = (over) => ({ tracking: true, target: { number: 9 }, phase: 'later', actsAway: 5, ...over });

describe('alertStage', () => {
  it('stays quiet while far away or not live', () => {
    expect(alertStage(st())).toBeNull();
    expect(alertStage(st({ tracking: false }))).toBeNull();
    expect(alertStage(st({ target: null }))).toBeNull();
  });
  it('alerts at three acts away, two acts away counts too', () => {
    expect(alertStage(st({ actsAway: 3 }))).toBe('three');
    expect(alertStage(st({ phase: 'soon', actsAway: 2 }))).toBe('three');
  });
  it('alerts again when up next, and not while on stage', () => {
    expect(alertStage(st({ phase: 'next', actsAway: 1 }))).toBe('next');
    expect(alertStage(st({ phase: 'onstage', actsAway: 0 }))).toBeNull();
  });
});
