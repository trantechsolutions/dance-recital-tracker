/**
 * Pure logic tests extracted from SearchDancerView and SearchActView useMemo computations.
 * These are tested without rendering to stay fast and deterministic.
 */
import { describe, it, expect } from 'vitest';

// --- Logic extracted from SearchDancerView ---
function computeDancerResults(showData, searchQuery) {
  if (!showData?.acts || !searchQuery.trim()) return [];
  const q = searchQuery.toLowerCase();
  const map = {};
  showData.acts.forEach(act => {
    act.performers?.forEach(name => {
      if (name.toLowerCase().includes(q)) {
        if (!map[name]) map[name] = [];
        map[name].push({ number: act.number, title: act.title });
      }
    });
  });
  return Object.entries(map)
    .map(([name, acts]) => ({ name, acts }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function computeFavoriteDancers(showData, favorites) {
  if (!showData?.acts || !favorites) return [];
  const map = {};
  showData.acts.forEach(act => {
    act.performers?.forEach(name => {
      if (favorites.has(name)) {
        if (!map[name]) map[name] = [];
        map[name].push({ number: act.number, title: act.title });
      }
    });
  });
  return Object.entries(map)
    .map(([name, acts]) => ({ name, acts }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --- Logic extracted from SearchActView ---
function computeActResults(showData, searchQuery) {
  if (!searchQuery.trim() || !showData?.acts) return [];
  const q = searchQuery.toLowerCase();
  return showData.acts.filter(act =>
    act.title?.toLowerCase().includes(q) ||
    String(act.number).includes(q) ||
    act.performers?.some(p => p.toLowerCase().includes(q))
  );
}

function computeFavoriteActs(showData, favorites, showId) {
  if (!showData?.acts || !favorites) return [];
  const actKey = (num) => showId ? `act-${showId}-${num}` : `act-${num}`;
  return showData.acts.filter(act =>
    favorites.has(actKey(act.number)) ||
    act.performers?.some(p => favorites.has(p))
  );
}

// --- Shared test data ---
const showData = {
  acts: [
    { number: 1, title: 'Opening Ballet', performers: ['Alice Smith', 'Bella Jones'] },
    { number: 2, title: 'Jazz Routine', performers: ['Alice Smith', 'Carol Lee'] },
    { number: 3, title: 'Tap Dance', performers: ['Diana Prince'] },
    { number: 4, title: 'Contemporary', performers: [] },
    { number: 10, title: 'Finale', performers: ['Alice Smith', 'Bella Jones', 'Carol Lee', 'Diana Prince'] },
  ],
};

// =============================================
// SearchDancerView logic
// =============================================
describe('computeDancerResults', () => {
  it('returns empty array for empty query', () => {
    expect(computeDancerResults(showData, '')).toEqual([]);
    expect(computeDancerResults(showData, '   ')).toEqual([]);
  });

  it('returns empty array when showData is null', () => {
    expect(computeDancerResults(null, 'Alice')).toEqual([]);
  });

  it('returns empty array when showData.acts is missing', () => {
    expect(computeDancerResults({}, 'Alice')).toEqual([]);
  });

  it('finds dancer by exact name match (case-insensitive)', () => {
    const results = computeDancerResults(showData, 'alice');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Alice Smith');
  });

  it('finds dancer by partial name', () => {
    const results = computeDancerResults(showData, 'jones');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Bella Jones');
  });

  it('aggregates all acts for a dancer appearing multiple times', () => {
    const results = computeDancerResults(showData, 'alice');
    expect(results[0].acts).toHaveLength(3); // acts 1, 2, 10
    const actNumbers = results[0].acts.map(a => a.number);
    expect(actNumbers).toContain(1);
    expect(actNumbers).toContain(2);
    expect(actNumbers).toContain(10);
  });

  it('returns results sorted alphabetically by dancer name', () => {
    const results = computeDancerResults(showData, 'a'); // matches Alice and Diana
    const names = results.map(r => r.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('returns empty array when no performers match', () => {
    expect(computeDancerResults(showData, 'zzzz')).toEqual([]);
  });

  it('handles acts with empty performers array without crashing', () => {
    const results = computeDancerResults(showData, 'contemporary');
    // Act 4 has no performers — no crash expected, no dancer result
    expect(results).toEqual([]);
  });

  it('does not deduplicate results when same name appears from different acts', () => {
    const results = computeDancerResults(showData, 'alice smith');
    expect(results).toHaveLength(1); // one dancer card, many acts
    expect(results[0].acts.length).toBeGreaterThan(1);
  });

  it('handles very long search query without crashing', () => {
    const longQuery = 'a'.repeat(10000);
    expect(() => computeDancerResults(showData, longQuery)).not.toThrow();
    expect(computeDancerResults(showData, longQuery)).toEqual([]);
  });

  it('handles special regex characters in search query without crashing', () => {
    expect(() => computeDancerResults(showData, '.*[')).not.toThrow();
  });
});

describe('computeFavoriteDancers', () => {
  it('returns empty array when favorites is empty', () => {
    expect(computeFavoriteDancers(showData, new Set())).toEqual([]);
  });

  it('returns empty array when favorites is null', () => {
    expect(computeFavoriteDancers(showData, null)).toEqual([]);
  });

  it('returns dancers whose names are in favorites', () => {
    const favorites = new Set(['Alice Smith', 'Diana Prince']);
    const results = computeFavoriteDancers(showData, favorites);
    const names = results.map(r => r.name);
    expect(names).toContain('Alice Smith');
    expect(names).toContain('Diana Prince');
  });

  it('does not include dancers not in favorites', () => {
    const favorites = new Set(['Alice Smith']);
    const results = computeFavoriteDancers(showData, favorites);
    expect(results.map(r => r.name)).not.toContain('Bella Jones');
  });

  it('aggregates acts for favorited dancer across multiple acts', () => {
    const favorites = new Set(['Alice Smith']);
    const results = computeFavoriteDancers(showData, favorites);
    expect(results[0].acts).toHaveLength(3);
  });

  it('returns results sorted alphabetically', () => {
    const favorites = new Set(['Carol Lee', 'Alice Smith', 'Bella Jones']);
    const results = computeFavoriteDancers(showData, favorites);
    const names = results.map(r => r.name);
    expect(names[0]).toBe('Alice Smith');
    expect(names[1]).toBe('Bella Jones');
    expect(names[2]).toBe('Carol Lee');
  });
});

// =============================================
// SearchActView logic
// =============================================
describe('computeActResults', () => {
  it('returns empty array for blank query', () => {
    expect(computeActResults(showData, '')).toEqual([]);
    expect(computeActResults(showData, '   ')).toEqual([]);
  });

  it('returns empty array when showData is null', () => {
    expect(computeActResults(null, 'ballet')).toEqual([]);
  });

  it('filters acts by title (case-insensitive)', () => {
    const results = computeActResults(showData, 'ballet');
    expect(results).toHaveLength(1);
    expect(results[0].number).toBe(1);
  });

  it('filters acts by act number as string', () => {
    const results = computeActResults(showData, '10');
    expect(results.some(a => a.number === 10)).toBe(true);
  });

  it('filters acts by performer name', () => {
    const results = computeActResults(showData, 'diana');
    const actNumbers = results.map(a => a.number);
    expect(actNumbers).toContain(3);
    expect(actNumbers).toContain(10);
  });

  it('single-digit number "1" matches act 1 AND act 10 (string includes)', () => {
    const results = computeActResults(showData, '1');
    const actNumbers = results.map(a => a.number);
    expect(actNumbers).toContain(1);
    expect(actNumbers).toContain(10);
  });

  it('returns empty array when no acts match', () => {
    expect(computeActResults(showData, 'zzz_nonexistent')).toEqual([]);
  });

  it('handles acts with no title gracefully (title=undefined)', () => {
    const weirdData = { acts: [{ number: 5, performers: ['Eve'] }] };
    expect(() => computeActResults(weirdData, 'eve')).not.toThrow();
    const results = computeActResults(weirdData, 'eve');
    expect(results[0].number).toBe(5);
  });

  it('handles acts with undefined performers gracefully', () => {
    const weirdData = { acts: [{ number: 6, title: 'Solo', performers: undefined }] };
    expect(() => computeActResults(weirdData, 'solo')).not.toThrow();
  });

  it('SQL injection-style input does not crash', () => {
    expect(() => computeActResults(showData, "' OR 1=1; --")).not.toThrow();
  });
});

describe('computeFavoriteActs', () => {
  it('returns empty array when favorites is empty', () => {
    expect(computeFavoriteActs(showData, new Set(), 'show1')).toEqual([]);
  });

  it('returns act when act-{showId}-{number} key is in favorites', () => {
    const favorites = new Set(['act-show1-2']);
    const results = computeFavoriteActs(showData, favorites, 'show1');
    expect(results).toHaveLength(1);
    expect(results[0].number).toBe(2);
  });

  it('falls back to act-{number} key when showId is not provided', () => {
    const favorites = new Set(['act-2']);
    const results = computeFavoriteActs(showData, favorites, null);
    expect(results).toHaveLength(1);
    expect(results[0].number).toBe(2);
  });

  it('returns act when any performer is in favorites', () => {
    const favorites = new Set(['Diana Prince']);
    const results = computeFavoriteActs(showData, favorites, 'show1');
    const actNumbers = results.map(a => a.number);
    expect(actNumbers).toContain(3);  // act 3 has Diana
    expect(actNumbers).toContain(10); // act 10 has Diana
  });

  it('deduplicates act if both act-key and performer match', () => {
    const favorites = new Set(['act-show1-10', 'Alice Smith']);
    const results = computeFavoriteActs(showData, favorites, 'show1');
    const act10 = results.filter(a => a.number === 10);
    expect(act10).toHaveLength(1);
  });

  it('does not include acts whose performers and act-key are not favorited', () => {
    const favorites = new Set(['act-show1-1']);
    const results = computeFavoriteActs(showData, favorites, 'show1');
    expect(results.map(a => a.number)).not.toContain(3);
  });
});

// =============================================
// ProgramView stat + progress computation
// =============================================
function computeStats(showData) {
  if (!showData?.acts) return null;
  const totalPerformers = new Set();
  showData.acts.forEach(act => act.performers?.forEach(p => totalPerformers.add(p)));
  return { acts: showData.acts.length, performers: totalPerformers.size };
}

function computeProgress(showData, currentAct) {
  if (!showData?.acts?.length || !currentAct?.isTracking) return null;
  return Math.min(Math.round((currentAct.number / showData.acts.length) * 100), 100);
}

describe('ProgramView stats computation', () => {
  it('returns null when showData has no acts', () => {
    expect(computeStats(null)).toBeNull();
    expect(computeStats({})).toBeNull();
  });

  it('counts total acts correctly', () => {
    expect(computeStats(showData).acts).toBe(5);
  });

  it('deduplicates performers across acts', () => {
    // Alice appears in acts 1, 2, 10 — should count once
    expect(computeStats(showData).performers).toBe(4); // Alice, Bella, Carol, Diana
  });

  it('counts zero performers when all acts have empty performers', () => {
    const emptyPerformers = { acts: [{ number: 1, performers: [] }, { number: 2, performers: [] }] };
    expect(computeStats(emptyPerformers).performers).toBe(0);
  });
});

describe('ProgramView progress computation', () => {
  it('returns null when not tracking', () => {
    expect(computeProgress(showData, { number: 2, isTracking: false })).toBeNull();
  });

  it('returns null when currentAct is null', () => {
    expect(computeProgress(showData, null)).toBeNull();
  });

  it('returns null when showData is null', () => {
    expect(computeProgress(null, { number: 1, isTracking: true })).toBeNull();
  });

  it('calculates progress as percentage of current act vs total', () => {
    // act 2 of 5 = 40%
    const progress = computeProgress(showData, { number: 2, isTracking: true });
    expect(progress).toBe(40);
  });

  it('caps progress at 100 even if act number exceeds total', () => {
    const progress = computeProgress(showData, { number: 999, isTracking: true });
    expect(progress).toBe(100);
  });

  it('returns 20% for first act of 5', () => {
    expect(computeProgress(showData, { number: 1, isTracking: true })).toBe(20);
  });

  it('returns 100% for last act of 5', () => {
    expect(computeProgress(showData, { number: 5, isTracking: true })).toBe(100);
  });
});
