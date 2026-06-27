import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { onSnapshot, getDocs, setDoc, doc } from 'firebase/firestore';

// Must be imported AFTER mocks are set up in setup.js
import { useLiveTracker } from '../hooks/useLiveTracker';

// Helper to simulate a Firestore snapshot
const makeSnap = (docs) => ({
  empty: docs.length === 0,
  docs: docs.map(d => ({ id: d.id, data: () => d })),
});

describe('useLiveTracker', () => {
  let unsubMock;
  let onSnapshotCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubMock = vi.fn();

    onSnapshot.mockImplementation((query, callback) => {
      onSnapshotCallback = callback;
      return unsubMock;
    });

    getDocs.mockResolvedValue(makeSnap([]));
    setDoc.mockResolvedValue(undefined);
    doc.mockReturnValue({ type: 'docRef', path: 'show_status/show1' });
  });

  it('sets loading=false and recitalData=null when orgId is null', () => {
    const { result } = renderHook(() => useLiveTracker(null, null));
    expect(result.current.loading).toBe(false);
    expect(result.current.recitalData).toBeNull();
  });

  it('sets loading=true while orgId is set but snapshot not yet received', () => {
    const { result } = renderHook(() => useLiveTracker('org1', null));
    expect(result.current.loading).toBe(true);
  });

  it('sets recitalData to empty object when shows snapshot is empty', async () => {
    const { result } = renderHook(() => useLiveTracker('org1', null));

    await act(async () => {
      await onSnapshotCallback(makeSnap([]));
    });

    expect(result.current.recitalData).toEqual({});
    expect(result.current.loading).toBe(false);
  });

  it('maps shows+acts into recitalData keyed by show id', async () => {
    const shows = [{ id: 'show1', org_id: 'org1', label: 'Saturday Show' }];
    const acts = [
      { id: 'a1', show_id: 'show1', number: 1, title: 'Opening', performers: ['Alice', 'Bob'] },
      { id: 'a2', show_id: 'show1', number: 2, title: 'Jazz', performers: [] },
    ];

    getDocs.mockResolvedValue(makeSnap(acts));

    const { result } = renderHook(() => useLiveTracker('org1', 'show1'));

    await act(async () => {
      await onSnapshotCallback(makeSnap(shows));
    });

    expect(result.current.recitalData).toEqual({
      show1: {
        id: 'show1',
        label: 'Saturday Show',
        acts: [
          { id: 'a1', number: 1, title: 'Opening', performers: ['Alice', 'Bob'] },
          { id: 'a2', number: 2, title: 'Jazz', performers: [] },
        ],
      },
    });
  });

  it('sorts acts by number client-side (no orderBy index required)', async () => {
    const shows = [{ id: 'show1', org_id: 'org1', label: 'Saturday Show' }];
    // Firestore returns acts unordered now that the query has no orderBy
    const acts = [
      { id: 'a3', show_id: 'show1', number: 3, title: 'Finale', performers: [] },
      { id: 'a1', show_id: 'show1', number: 1, title: 'Opening', performers: [] },
      { id: 'a2', show_id: 'show1', number: 2, title: 'Jazz', performers: [] },
    ];

    getDocs.mockResolvedValue(makeSnap(acts));

    const { result } = renderHook(() => useLiveTracker('org1', 'show1'));

    await act(async () => {
      await onSnapshotCallback(makeSnap(shows));
    });

    expect(result.current.recitalData.show1.acts.map(a => a.number)).toEqual([1, 2, 3]);
  });

  it('refetches acts when a show updated_at changes (stale-cache fix)', async () => {
    const show = (updatedAt) => ({ id: 'show1', org_id: 'org1', label: 'Show', updated_at: updatedAt });
    const v1 = [{ id: 'a1', show_id: 'show1', number: 1, title: 'Opening', performers: ['Alice', 'Bob'] }];
    const v2 = [{ id: 'a1', show_id: 'show1', number: 1, title: 'Opening', performers: ['Alice'] }];

    getDocs.mockResolvedValueOnce(makeSnap(v1)); // first acts fetch
    getDocs.mockResolvedValue(makeSnap([]));       // status checks etc.

    const { result } = renderHook(() => useLiveTracker('org1', null));

    await act(async () => {
      await onSnapshotCallback(makeSnap([show('t1')]));
    });
    expect(result.current.recitalData.show1.acts[0].performers).toEqual(['Alice', 'Bob']);

    getDocs.mockResolvedValueOnce(makeSnap(v2)); // refetch after edit
    getDocs.mockResolvedValue(makeSnap([]));
    await act(async () => {
      await onSnapshotCallback(makeSnap([show('t2')]));
    });
    expect(result.current.recitalData.show1.acts[0].performers).toEqual(['Alice']);
  });

  it('serves cached acts when updated_at is unchanged (no refetch)', async () => {
    const show = { id: 'show1', org_id: 'org1', label: 'Show', updated_at: 't1' };
    getDocs.mockResolvedValueOnce(makeSnap([
      { id: 'a1', show_id: 'show1', number: 1, title: 'Opening', performers: ['Alice'] },
    ]));
    getDocs.mockResolvedValue(makeSnap([]));

    const { result } = renderHook(() => useLiveTracker('org1', null));
    await act(async () => {
      await onSnapshotCallback(makeSnap([show]));
    });
    expect(result.current.recitalData.show1.acts[0].title).toBe('Opening');

    // If the cache were ignored this stale data would replace 'Opening'.
    getDocs.mockResolvedValue(makeSnap([
      { id: 'a1', show_id: 'show1', number: 1, title: 'CHANGED', performers: ['Zoe'] },
    ]));
    await act(async () => {
      await onSnapshotCallback(makeSnap([show]));
    });
    expect(result.current.recitalData.show1.acts[0].title).toBe('Opening');
  });

  it('defaults performers to empty array when field is missing from Firestore doc', async () => {
    const shows = [{ id: 'show1', org_id: 'org1', label: 'Show' }];
    const acts = [{ id: 'a1', show_id: 'show1', number: 1, title: 'Solo' }]; // no performers key

    getDocs.mockResolvedValue(makeSnap(acts));

    const { result } = renderHook(() => useLiveTracker('org1', 'show1'));

    await act(async () => {
      await onSnapshotCallback(makeSnap(shows));
    });

    expect(result.current.recitalData.show1.acts[0].performers).toEqual([]);
  });

  it('returns correct currentAct state from show_status snapshot', async () => {
    const shows = [{ id: 'show1', org_id: 'org1', label: 'Show' }];
    const acts = [{ id: 'a1', show_id: 'show1', number: 3, title: 'Ballet', performers: [] }];
    getDocs.mockResolvedValue(makeSnap(acts));

    // First onSnapshot call = shows listener; second = show_status listener
    let callCount = 0;
    let statusCallback;
    onSnapshot.mockImplementation((ref, cb) => {
      callCount++;
      if (callCount === 1) {
        onSnapshotCallback = cb;
      } else {
        statusCallback = cb;
      }
      return unsubMock;
    });

    const { result } = renderHook(() => useLiveTracker('org1', 'show1'));

    await act(async () => {
      await onSnapshotCallback(makeSnap(shows));
    });

    await act(async () => {
      statusCallback({
        exists: () => true,
        data: () => ({ current_act_number: 3, is_tracking: true }),
      });
    });

    expect(result.current.currentAct).toEqual({
      number: 3,
      title: 'Ballet',
      isTracking: true,
    });
  });

  it('sets currentAct title to "Act not found" when status points to a missing act number', async () => {
    const shows = [{ id: 'show1', org_id: 'org1', label: 'Show' }];
    const acts = [{ id: 'a1', show_id: 'show1', number: 1, title: 'Tap', performers: [] }];
    getDocs.mockResolvedValue(makeSnap(acts));

    let callCount = 0;
    let statusCallback;
    onSnapshot.mockImplementation((ref, cb) => {
      callCount++;
      if (callCount === 1) onSnapshotCallback = cb;
      else statusCallback = cb;
      return unsubMock;
    });

    const { result } = renderHook(() => useLiveTracker('org1', 'show1'));

    await act(async () => {
      await onSnapshotCallback(makeSnap(shows));
    });

    await act(async () => {
      statusCallback({
        exists: () => true,
        data: () => ({ current_act_number: 99, is_tracking: true }),
      });
    });

    expect(result.current.currentAct.title).toBe('Act not found');
    expect(result.current.currentAct.number).toBe(99);
  });

  it('sets currentAct to "Not Started" when show_status doc does not exist', async () => {
    const shows = [{ id: 'show1', org_id: 'org1', label: 'Show' }];
    getDocs.mockResolvedValue(makeSnap([]));

    let callCount = 0;
    let statusCallback;
    onSnapshot.mockImplementation((ref, cb) => {
      callCount++;
      if (callCount === 1) onSnapshotCallback = cb;
      else statusCallback = cb;
      return unsubMock;
    });

    const { result } = renderHook(() => useLiveTracker('org1', 'show1'));

    await act(async () => {
      await onSnapshotCallback(makeSnap(shows));
    });

    await act(async () => {
      statusCallback({ exists: () => false });
    });

    expect(result.current.currentAct).toEqual({ number: 1, title: 'Not Started', isTracking: false });
  });

  it('updateActNumber calls setDoc with correct payload', async () => {
    const { result } = renderHook(() => useLiveTracker('org1', 'show1'));

    await act(async () => {
      await result.current.updateActNumber(5);
    });

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'docRef' }),
      expect.objectContaining({
        show_id: 'show1',
        org_id: 'org1',
        current_act_number: 5,
        is_tracking: true,
      }),
      { merge: true }
    );
  });

  it('updateActNumber is a no-op when orgId or selectedShowId is missing', async () => {
    const { result } = renderHook(() => useLiveTracker(null, null));

    await act(async () => {
      await result.current.updateActNumber(5);
    });

    expect(setDoc).not.toHaveBeenCalled();
  });

  it('toggleTracking flips is_tracking from false to true', async () => {
    const shows = [{ id: 'show1', org_id: 'org1', label: 'Show' }];
    getDocs.mockResolvedValue(makeSnap([]));

    let callCount = 0;
    let statusCallback;
    onSnapshot.mockImplementation((ref, cb) => {
      callCount++;
      if (callCount === 1) onSnapshotCallback = cb;
      else statusCallback = cb;
      return unsubMock;
    });

    const { result } = renderHook(() => useLiveTracker('org1', 'show1'));

    await act(async () => {
      await onSnapshotCallback(makeSnap(shows));
    });

    // currentAct.isTracking starts false
    await act(async () => {
      await result.current.toggleTracking();
    });

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'docRef' }),
      expect.objectContaining({ is_tracking: true }),
      { merge: true }
    );
  });

  it('unsubscribes from shows listener on unmount', () => {
    const { unmount } = renderHook(() => useLiveTracker('org1', null));
    unmount();
    expect(unsubMock).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe while disabled (auth not ready), then subscribes once enabled', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useLiveTracker('org1', null, enabled),
      { initialProps: { enabled: false } }
    );

    // Gated off: no listener, but loading stays true so the UI doesn't flash
    // empty content before the real subscription resolves.
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
    expect(result.current.recitalData).toBeNull();

    // Auth becomes ready → the listener subscribes.
    rerender({ enabled: true });
    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });
});
