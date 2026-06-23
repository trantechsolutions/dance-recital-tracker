import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDocs, deleteDoc, setDoc, doc, writeBatch } from 'firebase/firestore';

import { deleteShow, deleteStudio, saveShow, updateOrgName, findOrphanedShows, relinkShows } from '../services/showService';

// Snapshot helper mirroring Firestore's shape. `ref` is attached so service
// code that calls batch.delete(d.ref) / batch.set(d.ref, ...) works.
const makeSnap = (docs) => ({
  empty: docs.length === 0,
  size: docs.length,
  docs: docs.map((d, i) => ({ id: d.id ?? `doc${i}`, ref: { id: d.id ?? `doc${i}` }, data: () => d })),
});

describe('showService.deleteShow', () => {
  let batchSets;
  let batchDeletes;

  beforeEach(() => {
    vi.clearAllMocks();
    batchSets = [];
    batchDeletes = [];
    writeBatch.mockImplementation(() => ({
      set: (...args) => batchSets.push(args),
      delete: (...args) => batchDeletes.push(args),
      commit: () => Promise.resolve(),
    }));
    deleteDoc.mockResolvedValue(undefined);
  });

  it('deletes acts + show + show_status and scrubs only orphaned favorites', async () => {
    // 1. acts for the deleted show
    getDocs.mockResolvedValueOnce(makeSnap([
      { id: 'act1', show_id: 'showA', number: 1, performers: ['Alice', 'Bob'] },
      { id: 'act2', show_id: 'showA', number: 2, performers: ['Carol'] },
    ]));
    // 2. all shows in the org
    getDocs.mockResolvedValueOnce(makeSnap([{ id: 'showA' }, { id: 'showB' }]));
    // 3. acts for the OTHER show (showB) — Bob still performs here
    getDocs.mockResolvedValueOnce(makeSnap([
      { id: 'actB1', show_id: 'showB', number: 1, performers: ['Bob'] },
    ]));
    // 4. user_profiles matching the favorite keys to scrub
    const userRef = { id: 'user1' };
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'user1',
        ref: userRef,
        data: () => ({ favorites: ['Alice', 'Bob', 'act-showA-1', 'act-showB-1', 'Zoe'] }),
      }],
    });

    const result = await deleteShow('org1', 'showA');

    // Acts deleted (2), show + show_status deleted
    expect(batchDeletes).toHaveLength(2);
    expect(deleteDoc).toHaveBeenCalledTimes(2);

    // Favorites scrub: Alice + Carol (orphans) and showA act keys removed.
    // Bob preserved (still in showB); showB act key + Zoe preserved.
    const favWrite = batchSets.find(([ref]) => ref === userRef);
    expect(favWrite).toBeDefined();
    expect(favWrite[1]).toEqual({ favorites: ['Bob', 'act-showB-1', 'Zoe'] });
    expect(favWrite[2]).toEqual({ merge: true });

    expect(result).toEqual({ actCount: 2, dancersRemoved: 2, usersUpdated: 1 });
  });

  it('skips favorites work and other-show lookup when the show has no acts', async () => {
    getDocs.mockResolvedValueOnce(makeSnap([])); // no acts

    const result = await deleteShow('org1', 'emptyShow');

    expect(getDocs).toHaveBeenCalledTimes(1); // no org/other-show/profile queries
    expect(batchDeletes).toHaveLength(0);
    expect(deleteDoc).toHaveBeenCalledTimes(2); // still removes show + show_status
    expect(result).toEqual({ actCount: 0, dancersRemoved: 0, usersUpdated: 0 });
  });
});

describe('showService.deleteStudio', () => {
  let batchSets;
  let batchDeletes;

  beforeEach(() => {
    vi.clearAllMocks();
    batchSets = [];
    batchDeletes = [];
    writeBatch.mockImplementation(() => ({
      set: (...args) => batchSets.push(args),
      delete: (...args) => batchDeletes.push(args),
      commit: () => Promise.resolve(),
    }));
    deleteDoc.mockResolvedValue(undefined);
  });

  it('scrubs scoped act keys + orphan names, preserving dancers in other studios', async () => {
    const log = vi.fn();

    // 1. shows in the target org
    getDocs.mockResolvedValueOnce(makeSnap([{ id: 'showA' }]));
    // 2. acts for showA
    getDocs.mockResolvedValueOnce(makeSnap([
      { id: 'act1', show_id: 'showA', number: 1, performers: ['Alice', 'Bob'] },
      { id: 'act2', show_id: 'showA', number: 2, performers: ['Carol'] },
    ]));
    // 3. all shows (for external-performer scoping) — showZ belongs to another org
    getDocs.mockResolvedValueOnce(makeSnap([{ id: 'showA' }, { id: 'showZ' }]));
    // 4. acts for the external show showZ — Bob also dances here
    getDocs.mockResolvedValueOnce(makeSnap([
      { id: 'actZ1', show_id: 'showZ', number: 1, performers: ['Bob'] },
    ]));
    // 5. user_profiles matching the favorite keys to scrub
    const userRef = { id: 'user1' };
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'user1',
        ref: userRef,
        data: () => ({ favorites: ['Alice', 'Bob', 'Carol', 'act-showA-1', 'act-showZ-1'] }),
      }],
    });

    const result = await deleteStudio('org1', log);

    // org doc + show + show_status deleted via deleteDoc
    expect(deleteDoc).toHaveBeenCalledTimes(3);

    // Alice + Carol (orphans) and showA act keys removed.
    // Bob preserved (dances in showZ); external act key untouched.
    const favWrite = batchSets.find(([ref]) => ref === userRef);
    expect(favWrite[1]).toEqual({ favorites: ['Bob', 'act-showZ-1'] });
    expect(favWrite[2]).toEqual({ merge: true });

    expect(result).toEqual({ totalActs: 2, showCount: 1, usersUpdated: 1 });
  });

  it('removes all dancer favorites when no other studio retains them', async () => {
    const log = vi.fn();
    getDocs.mockResolvedValueOnce(makeSnap([{ id: 'showA' }]));
    getDocs.mockResolvedValueOnce(makeSnap([
      { id: 'act1', show_id: 'showA', number: 1, performers: ['Alice'] },
    ]));
    getDocs.mockResolvedValueOnce(makeSnap([{ id: 'showA' }])); // no external shows
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'u1', ref: { id: 'u1' }, data: () => ({ favorites: ['Alice', 'act-showA-1', 'Keep'] }) }],
    });

    const result = await deleteStudio('org1', log);

    const favWrite = batchSets[batchSets.length - 1];
    expect(favWrite[1]).toEqual({ favorites: ['Keep'] });
    expect(result.usersUpdated).toBe(1);
  });
});

describe('showService.saveShow', () => {
  let batchSets;

  beforeEach(() => {
    vi.clearAllMocks();
    batchSets = [];
    writeBatch.mockImplementation(() => ({
      set: (...args) => batchSets.push(args),
      delete: vi.fn(),
      commit: () => Promise.resolve(),
    }));
  });

  it('stamps updated_at on the show doc so live viewers refetch acts', async () => {
    getDocs.mockResolvedValueOnce(makeSnap([])); // no existing acts

    await saveShow('org1', 'show1', 'Saturday', [{ number: 1, title: 'Opening', performers: ['A'] }]);

    const showWrite = batchSets[0];
    expect(showWrite[1]).toMatchObject({ org_id: 'org1', label: 'Saturday' });
    expect(typeof showWrite[1].updated_at).toBe('string');
  });

  it('persists a changed label (show rename rides the save flow)', async () => {
    getDocs.mockResolvedValueOnce(makeSnap([]));

    await saveShow('org1', 'show1', 'Saturday Matinee (corrected)', []);

    expect(batchSets[0][1]).toMatchObject({ label: 'Saturday Matinee (corrected)' });
  });
});

describe('showService.findOrphanedShows', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('groups shows whose org_id has no matching organization doc', async () => {
    // 1. organizations  2. shows
    getDocs.mockResolvedValueOnce(makeSnap([{ id: 'dancers-pointe' }]));
    getDocs.mockResolvedValueOnce(makeSnap([
      { id: 'show1', org_id: 'dancers-pointe', label: 'Kept' },
      { id: 'show2', org_id: 'dancer-s-pointe', label: 'Orphan A' },
      { id: 'show3', org_id: 'dancer-s-pointe', label: 'Orphan B' },
      { id: 'show4', label: 'No Org' },
    ]));

    const orphans = await findOrphanedShows();

    expect(Object.keys(orphans).sort()).toEqual(['(no org_id)', 'dancer-s-pointe']);
    expect(orphans['dancer-s-pointe'].map(s => s.label)).toEqual(['Orphan A', 'Orphan B']);
    expect(orphans['(no org_id)']).toHaveLength(1);
  });

  it('returns an empty map when every show is linked', async () => {
    getDocs.mockResolvedValueOnce(makeSnap([{ id: 'org1' }]));
    getDocs.mockResolvedValueOnce(makeSnap([{ id: 'show1', org_id: 'org1', label: 'Fine' }]));

    expect(await findOrphanedShows()).toEqual({});
  });
});

describe('showService.relinkShows', () => {
  let batchSets;

  beforeEach(() => {
    vi.clearAllMocks();
    batchSets = [];
    writeBatch.mockImplementation(() => ({
      set: (...args) => batchSets.push(args),
      delete: vi.fn(),
      commit: () => Promise.resolve(),
    }));
  });

  it('re-points each show and its show_status to the target org', async () => {
    await relinkShows(['showA', 'showB'], 'dancers-pointe');

    // 2 shows × (show doc + show_status doc)
    expect(batchSets).toHaveLength(4);
    const showWrites = batchSets.filter(([, data]) => 'updated_at' in data);
    const statusWrites = batchSets.filter(([, data]) => 'show_id' in data);
    expect(showWrites).toHaveLength(2);
    expect(statusWrites).toHaveLength(2);
    showWrites.forEach(([, data, opts]) => {
      expect(data.org_id).toBe('dancers-pointe');
      expect(opts).toEqual({ merge: true });
    });
    statusWrites.forEach(([, data, opts]) => {
      expect(data.org_id).toBe('dancers-pointe');
      expect(opts).toEqual({ merge: true });
    });
  });
});

describe('showService.updateOrgName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDoc.mockResolvedValue(undefined);
  });

  it('merges the new name and backfills slug — the doc id is never rewritten', async () => {
    await updateOrgName('dancers-pointe', "Dancer's Pointe Studio");

    expect(doc).toHaveBeenCalledWith({}, 'organizations', 'dancers-pointe');
    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(setDoc).toHaveBeenCalledWith(
      { type: 'docRef' },
      { name: "Dancer's Pointe Studio", slug: 'dancers-pointe' },
      { merge: true }
    );
  });
});
