import { describe, it, expect } from 'vitest';
import { getMyActs, getLiveStatus, liveInstruction, whoLabel, actKeyFor } from '../utils/liveProgress';

const SHOW = 'show-1';
const showData = {
  acts: [
    { number: 1, title: 'New York New York', performers: ['Ava T.', 'Emma H.'] },
    { number: 2, title: 'Earthquake', performers: ['Olivia M.'] },
    { number: 3, title: 'Little Fishies', performers: [] },
    { number: 4, title: 'Voulez-Vous', performers: ['Ava K.'] },
    { number: 5, title: 'Bella Tarantella', performers: [] },
    { number: 6, title: 'Fiesty', performers: [] },
    { number: 8, title: 'Oh My Gosh', performers: ['Ava K.', 'Mia T.'] }, // gap: no act 7
  ],
};
const live = (n) => ({ number: n, title: '', isTracking: true });

describe('getMyActs', () => {
  it('returns nothing without favorites', () => {
    expect(getMyActs(showData, new Set(), SHOW)).toEqual([]);
  });

  it('includes starred acts and acts with followed dancers, in running order', () => {
    const favs = new Set(['Ava K.', actKeyFor(SHOW, 2)]);
    const mine = getMyActs(showData, favs, SHOW);
    expect(mine.map(a => a.number)).toEqual([2, 4, 8]);
    expect(mine[0].isActFav).toBe(true);
    expect(mine[1].favoritedDancers).toEqual(['Ava K.']);
  });
});

describe('getLiveStatus', () => {
  const favs = new Set(['Ava K.']);

  it('is idle when the show is not tracked, pointing at the first followed act', () => {
    const s = getLiveStatus(showData, { number: 1, isTracking: false }, favs, SHOW);
    expect(s.phase).toBe('idle');
    expect(s.target.number).toBe(4);
  });

  it('counts acts away by position, not act number', () => {
    const s = getLiveStatus(showData, live(5), favs, SHOW);
    // positions: 5 is index 4, act 8 is index 6 → 2 away even though 8 - 5 = 3
    expect(s.target.number).toBe(8);
    expect(s.actsAway).toBe(2);
    expect(s.phase).toBe('soon');
  });

  it('tells you which act to head back after when 3+ away', () => {
    const s = getLiveStatus(showData, live(1), favs, SHOW);
    expect(s.phase).toBe('later');
    expect(s.actsAway).toBe(3);
    expect(s.headBackAfter.number).toBe(2);
  });

  it('flags up next and on stage', () => {
    expect(getLiveStatus(showData, live(3), favs, SHOW).phase).toBe('next');
    expect(getLiveStatus(showData, live(4), favs, SHOW).phase).toBe('onstage');
  });

  it('is done after the last followed act, and none with no follows', () => {
    expect(getLiveStatus(showData, { number: 8, isTracking: true }, new Set(['Olivia M.']), SHOW).phase).toBe('done');
    expect(getLiveStatus(showData, live(2), new Set(), SHOW).phase).toBe('none');
  });

  it('treats intermission as "the current act has finished"', () => {
    const s = getLiveStatus(showData, { number: 3, isTracking: true, phase: 'intermission' }, favs, SHOW);
    expect(s.intermission).toBe(true);
    expect(s.phase).toBe('next'); // act 4 is first after the break
    const onIt = getLiveStatus(showData, { number: 4, isTracking: true, phase: 'intermission' }, favs, SHOW);
    expect(onIt.phase).toBe('later'); // act 4 is done; act 8 is next for Ava
  });

  it('flags a show that has ended', () => {
    const s = getLiveStatus(showData, { number: 8, isTracking: false, phase: 'ended' }, favs, SHOW);
    expect(s.ended).toBe(true);
    expect(s.target).toBeNull();
  });

  it('exposes the act on stage and the one after it', () => {
    const s = getLiveStatus(showData, live(6), favs, SHOW);
    expect(s.onStage.title).toBe('Fiesty');
    expect(s.upNext.number).toBe(8);
  });
});

describe('whoLabel / liveInstruction', () => {
  it('names one, two, or counts many dancers', () => {
    expect(whoLabel({ favoritedDancers: ['Ava K.'] }).who).toBe('Ava K.');
    expect(whoLabel({ favoritedDancers: ['Ava K.', 'Mia T.'] })).toEqual({ who: 'Ava K. and Mia T.', plural: true });
    expect(whoLabel({ favoritedDancers: ['a', 'b', 'c'] }).who).toBe('3 of your dancers');
    expect(whoLabel({ favoritedDancers: [] }).who).toBe('Your act');
  });

  it('writes the instruction for each phase', () => {
    const favs = new Set(['Ava K.']);
    expect(liveInstruction(getLiveStatus(showData, live(1), favs, SHOW))).toBe('Ava K. is on in 3 acts. Head back after act 2.');
    expect(liveInstruction(getLiveStatus(showData, live(3), favs, SHOW))).toBe('Ava K. is up next. Head to your seat now.');
    expect(liveInstruction(getLiveStatus(showData, live(4), favs, SHOW))).toBe('Ava K. is on stage now.');
    const both = new Set(['Ava K.', 'Mia T.']);
    expect(liveInstruction(getLiveStatus(showData, live(6), both, SHOW))).toBe('Ava K. and Mia T. are up next. Head to your seat now.');
  });
});
