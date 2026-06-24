import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDocs, deleteDoc, setDoc, doc, writeBatch } from 'firebase/firestore';

import { deleteShow, deleteStudio, saveShow, updateOrgName, findOrphanedShows, relinkShows, preserveActIds, uploadActsForShow, bulkImportShows } from '../services/showService';

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

  it('preserves an existing act id and generates one for acts that lack it', async () => {
    getDocs.mockResolvedValueOnce(makeSnap([])); // no existing acts

    await saveShow('org1', 'show1', 'Saturday', [
      { number: 1, title: 'Kept', performers: ['A'], id: 'stable-123' },
      { number: 2, title: 'New', performers: ['B'] },
    ]);

    // batchSets[0] is the show doc; act writes follow.
    const actWrites = batchSets.slice(1).map(args => args[1]);
    const kept = actWrites.find(a => a.title === 'Kept');
    const fresh = actWrites.find(a => a.title === 'New');

    expect(kept.id).toBe('stable-123'); // reorder/edit keeps the same id
    expect(typeof fresh.id).toBe('string'); // legacy/new act gets a generated id
    expect(fresh.id.length).toBeGreaterThan(0);
    expect(fresh.id).not.toBe('stable-123');
  });
});

describe('showService.preserveActIds', () => {
  const existing = [
    { id: 'id-open', number: 1, title: 'Opening' },
    { id: 'id-jazz', number: 2, title: 'Jazz Hands' },
    { id: 'id-finale', number: 3, title: 'Finale' },
  ];

  it('carries the existing id onto a matching title even when renumbered', () => {
    // Jazz Hands moved from #2 to #1; its note must follow by title.
    const result = preserveActIds(existing, [
      { number: 1, title: 'Jazz Hands', performers: ['A'] },
      { number: 2, title: 'Opening', performers: ['B'] },
    ]);
    expect(result.find(a => a.title === 'Jazz Hands').id).toBe('id-jazz');
    expect(result.find(a => a.title === 'Opening').id).toBe('id-open');
  });

  it('falls back to act number when the title was changed', () => {
    const result = preserveActIds(existing, [
      { number: 1, title: 'Opening Number (renamed)', performers: ['A'] },
    ]);
    // No title match → claims the act sitting at the same number.
    expect(result[0].id).toBe('id-open');
  });

  it('mints a fresh id for genuinely new acts and never reuses one twice', () => {
    const result = preserveActIds(existing, [
      { number: 1, title: 'Opening', performers: ['A'] },
      { number: 2, title: 'Opening', performers: ['B'] }, // duplicate title
    ]);
    expect(result[0].id).toBe('id-open');      // first claims the only match
    expect(result[1].id).not.toBe('id-open');  // second cannot reuse it
    expect(typeof result[1].id).toBe('string');
    expect(result[1].id.length).toBeGreaterThan(0);
  });

  it('keeps an id the incoming act already carries', () => {
    const result = preserveActIds(existing, [{ number: 9, title: 'X', id: 'explicit-id' }]);
    expect(result[0].id).toBe('explicit-id');
  });
});

describe('showService.uploadActsForShow', () => {
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
  });

  it('preserves existing act ids by title so dancer notes survive re-import', async () => {
    getDocs.mockResolvedValueOnce(makeSnap([
      { show_id: 'show1', number: 1, title: 'Opening', performers: ['A'], id: 'stable-open' },
      { show_id: 'show1', number: 2, title: 'Finale', performers: ['B'], id: 'stable-finale' },
    ]));

    // Re-import: same titles, reordered, plus a brand-new act. No ids in CSV.
    const saved = await uploadActsForShow('show1', [
      { number: 1, title: 'Finale', performers: ['B'] },
      { number: 2, title: 'Opening', performers: ['A'] },
      { number: 3, title: 'Encore', performers: ['C'] },
    ]);

    expect(saved.find(a => a.title === 'Finale').id).toBe('stable-finale');
    expect(saved.find(a => a.title === 'Opening').id).toBe('stable-open');
    expect(saved.find(a => a.title === 'Encore').id).not.toBe('stable-open');
    // Old act docs cleared before the rewrite.
    expect(batchDeletes).toHaveLength(2);
  });
});

describe('showService.bulkImportShows', () => {
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
    setDoc.mockResolvedValue(undefined);
  });

  it('creates a new show + show_status when no show matches the label', async () => {
    const log = vi.fn();
    const { newRecitalData, totalActs } = await bulkImportShows(
      'org1',
      { 'Saturday 2pm': [{ number: 1, title: 'Opening', performers: ['A'] }] },
      {},
      log,
    );

    expect(totalActs).toBe(1);
    // show + show_status created together via a batch (no per-show getDocs).
    expect(getDocs).not.toHaveBeenCalled();
    const created = Object.values(newRecitalData)[0];
    expect(created.label).toBe('Saturday 2pm');
    expect(created.acts[0].id).toBeTruthy();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Creating "Saturday 2pm"'));
  });

  it('updates a same-named show in place, preserving act ids and its show id', async () => {
    const log = vi.fn();
    const existingRecitalData = {
      'org1-saturday-2pm-123': {
        id: 'org1-saturday-2pm-123',
        label: 'Saturday 2pm',
        acts: [
          { number: 1, title: 'Opening', performers: ['A'], id: 'stable-open' },
          { number: 2, title: 'Finale', performers: ['B'], id: 'stable-finale' },
        ],
      },
    };
    // Existing act docs fetched for deletion before the rewrite.
    getDocs.mockResolvedValueOnce(makeSnap([{ id: 'docA' }, { id: 'docB' }]));

    const { newRecitalData, totalActs } = await bulkImportShows(
      'org1',
      { 'Saturday 2pm': [
        { number: 1, title: 'Finale', performers: ['B'] },
        { number: 2, title: 'Opening', performers: ['A'] },
      ] },
      existingRecitalData,
      log,
    );

    expect(totalActs).toBe(2);
    // No duplicate show: the same show id is reused.
    expect(Object.keys(newRecitalData)).toEqual(['org1-saturday-2pm-123']);
    const updated = newRecitalData['org1-saturday-2pm-123'];
    expect(updated.acts.find(a => a.title === 'Finale').id).toBe('stable-finale');
    expect(updated.acts.find(a => a.title === 'Opening').id).toBe('stable-open');
    // Old acts cleared; show_status NOT recreated (only the show doc merged).
    expect(batchDeletes).toHaveLength(2);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Updating "Saturday 2pm"'));
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
