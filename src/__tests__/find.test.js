import { describe, it, expect } from 'vitest';
import { findDancers, findActs } from '../utils/find';

const data = {
  sat12: { id: 'sat12', label: 'Sat 12pm', acts: [
    { number: 1, title: 'New York New York', performers: ['Emma Hart', 'Ava Kline'] },
    { number: 2, title: 'Earthquake', performers: ['Emma Hart'] },
  ] },
  sat5: { id: 'sat5', label: 'Sat 5pm', acts: [
    { number: 3, title: 'Home', performers: ['Emma Hart', 'Émilie Roux'] },
    { number: 4, title: 'Think', performers: ['Zoe Emmet'] },
  ] },
};
const initial = (n) => n.replace(/ (\S)\S*$/, ' $1.');

describe('findDancers', () => {
  it('groups acts in this show and other shows', () => {
    const [emma] = findDancers(data, 'sat12', 'emma h');
    expect(emma.name).toBe('Emma Hart');
    expect(emma.here.map(a => a.number)).toEqual([1, 2]);
    expect(emma.elsewhere).toEqual([{ showId: 'sat5', label: 'Sat 5pm', numbers: [3] }]);
  });

  it('lists dancers in the current show first', () => {
    const names = findDancers(data, 'sat5', 'em').map(d => d.name);
    expect(names.slice(0, 3).sort()).toEqual(['Emma Hart', 'Zoe Emmet', 'Émilie Roux'].sort());
    expect(findDancers(data, 'sat12', 'em')[0].name).toBe('Emma Hart');
  });

  it('ignores accents', () => {
    expect(findDancers(data, 'sat5', 'emilie')[0].name).toBe('Émilie Roux');
  });

  it('cannot find a hidden surname through the redacted name', () => {
    expect(findDancers(data, 'sat12', 'kline', initial)).toEqual([]);
    expect(findDancers(data, 'sat12', 'ava k', initial)).toHaveLength(1);
  });

  it('flags two dancers who look the same once surnames are shortened', () => {
    const twins = { x: { id: 'x', label: 'X', acts: [
      { number: 1, title: 'A', performers: ['Ava Kline', 'Ava Knox', 'Mia Tran'] },
    ] } };
    const res = findDancers(twins, 'x', 'ava', initial);
    expect(res).toHaveLength(2);
    expect(res.every(d => d.duplicate)).toBe(true);
    expect(findDancers(twins, 'x', 'mia', initial)[0].duplicate).toBe(false);
  });

  it('returns nothing for an empty query', () => {
    expect(findDancers(data, 'sat12', '  ')).toEqual([]);
  });
});

describe('findActs', () => {
  it('matches title or exact number in this show only', () => {
    expect(findActs(data.sat12, 'earth').map(a => a.number)).toEqual([2]);
    expect(findActs(data.sat12, '1').map(a => a.number)).toEqual([1]);
    expect(findActs(data.sat12, 'home')).toEqual([]);
  });
});
