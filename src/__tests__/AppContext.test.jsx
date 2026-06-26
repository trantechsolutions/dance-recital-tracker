import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, getDocs, setDoc } from 'firebase/firestore';
import { AppProvider, useApp } from '../context/AppContext';

// Test consumer to expose context values
function ContextConsumer({ onRender }) {
  const ctx = useApp();
  onRender(ctx);
  return null;
}

const renderWithProvider = (onRender) =>
  render(
    <MemoryRouter>
      <AppProvider>
        <ContextConsumer onRender={onRender} />
      </AppProvider>
    </MemoryRouter>
  );

describe('AppContext', () => {
  let authCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    onAuthStateChanged.mockImplementation((auth, cb) => {
      authCallback = cb;
      return vi.fn(); // unsubscribe
    });

    getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
    setDoc.mockResolvedValue(undefined);
  });

  it('starts with isAuthChecking=true and user=null', () => {
    let captured;
    renderWithProvider(ctx => { captured = ctx; });
    expect(captured.isAuthChecking).toBe(true);
    expect(captured.user).toBeNull();
  });

  it('sets isAuthChecking=false after auth resolves with no user', async () => {
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(null);
    });

    expect(captured.isAuthChecking).toBe(false);
    expect(captured.user).toBeNull();
    expect(captured.isAuthorized).toBe(false);
  });

  it('sets user and isSuperAdmin=true when email is in authorizedUsers', async () => {
    const mockUser = { uid: 'u1', email: 'superadmin@test.com' };

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    expect(captured.user).toBe(mockUser);
    expect(captured.isSuperAdmin).toBe(true);
    expect(captured.isAuthorized).toBe(true);
  });

  it('sets isSuperAdmin=false for non-authorized email', async () => {
    const mockUser = { uid: 'u2', email: 'dancer@example.com' };
    getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    expect(captured.isSuperAdmin).toBe(false);
    expect(captured.isAuthorized).toBe(false);
  });

  it('loads favorites from Firestore profile on login', async () => {
    const mockUser = { uid: 'u3', email: 'fan@example.com' };
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ favorites: ['Alice', 'Bob'] }),
    });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    expect(captured.favorites.has('Alice')).toBe(true);
    expect(captured.favorites.has('Bob')).toBe(true);
  });

  it('initializes empty favorites when profile has no favorites field', async () => {
    const mockUser = { uid: 'u4', email: 'new@example.com' };
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    expect(captured.favorites.size).toBe(0);
  });

  it('clears user and favorites on logout', async () => {
    const mockUser = { uid: 'u5', email: 'fan@example.com' };
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ favorites: ['Alice'] }),
    });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    expect(captured.favorites.has('Alice')).toBe(true);

    await act(async () => {
      authCallback(null); // logout
    });

    expect(captured.user).toBeNull();
    expect(captured.favorites.size).toBe(0);
  });

  it('upserts user profile with last_login on login', async () => {
    const mockUser = { uid: 'u6', email: 'fan@example.com' };
    getDoc.mockResolvedValue({ exists: () => false });

    renderWithProvider(() => {});

    await act(async () => {
      authCallback(mockUser);
    });

    expect(setDoc).toHaveBeenCalledWith(
      { type: 'docRef' },
      expect.objectContaining({ email: 'fan@example.com', last_login: expect.any(String) }),
      { merge: true }
    );
  });

  it('skipLogin persists to localStorage', async () => {
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(null);
    });

    act(() => { captured.skipLogin(); });

    expect(localStorage.getItem('hasSkippedLogin')).toBe('true');
    expect(captured.hasSkippedLogin).toBe(true);
  });

  it('clearSkipLogin removes from localStorage', async () => {
    localStorage.setItem('hasSkippedLogin', 'true');

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(null);
    });

    act(() => { captured.clearSkipLogin(); });

    expect(localStorage.getItem('hasSkippedLogin')).toBeNull();
    expect(captured.hasSkippedLogin).toBe(false);
  });

  it('tutorial: openTutorial shows it, dismissTutorial hides it and records the seen flag', async () => {
    let captured;
    renderWithProvider(ctx => { captured = ctx; });
    await act(async () => { authCallback(null); });

    // Fresh visitor: nothing stored, so first-run should be due.
    expect(captured.tutorialNeverSeen()).toBe(true);
    expect(captured.showTutorial).toBe(false);

    act(() => { captured.openTutorial(); });
    expect(captured.showTutorial).toBe(true);

    act(() => { captured.dismissTutorial(); });
    expect(captured.showTutorial).toBe(false);
    expect(captured.tutorialNeverSeen()).toBe(false); // flag persisted
    expect(localStorage.getItem('tutorialSeen_v1')).not.toBeNull();
  });

  it('tutorial: the admin variant opens without recording the general first-run flag', async () => {
    let captured;
    renderWithProvider(ctx => { captured = ctx; });
    await act(async () => { authCallback(null); });

    act(() => { captured.openTutorial('admin'); });
    expect(captured.showTutorial).toBe(true);
    expect(captured.tutorialVariant).toBe('admin');

    act(() => { captured.dismissTutorial(); });
    expect(captured.showTutorial).toBe(false);
    // Admin tour must NOT suppress the user-facing first-run auto-open.
    expect(localStorage.getItem('tutorialSeen_v1')).toBeNull();
    expect(captured.tutorialNeverSeen()).toBe(true);
  });

  it('tutorial: resetTutorial clears the seen flag so first-run fires again', async () => {
    localStorage.setItem('tutorialSeen_v1', new Date().toISOString());

    let captured;
    renderWithProvider(ctx => { captured = ctx; });
    await act(async () => { authCallback(null); });

    expect(captured.tutorialNeverSeen()).toBe(false);

    act(() => { captured.resetTutorial(); });

    expect(localStorage.getItem('tutorialSeen_v1')).toBeNull();
    expect(captured.tutorialNeverSeen()).toBe(true);
  });
});

describe('AppContext.toggleFavorite', () => {
  let authCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    onAuthStateChanged.mockImplementation((auth, cb) => {
      authCallback = cb;
      return vi.fn();
    });
    getDoc.mockResolvedValue({ exists: () => false });
    setDoc.mockResolvedValue(undefined);
  });

  it('saves favorites locally (not to Firestore) when no user is logged in', async () => {
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(null);
    });

    let result;
    await act(async () => {
      result = await captured.toggleFavorite('Alice');
    });

    expect(result).toBe(true);
    expect(captured.loginPromptOpen).toBe(false);
    expect(captured.favorites.has('Alice')).toBe(true);
    expect(JSON.parse(localStorage.getItem('guestFavorites'))).toEqual(['Alice']);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('seeds favorites from guest localStorage on a logged-out load', async () => {
    localStorage.setItem('guestFavorites', JSON.stringify(['Bob']));

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(null);
    });

    expect(captured.favorites.has('Bob')).toBe(true);
  });

  it('prompts to sync (without auto-merging) when logging in with guest data', async () => {
    localStorage.setItem('guestFavorites', JSON.stringify(['Bob']));
    localStorage.setItem('guestDancerNotes', JSON.stringify({ 's::1::Bob': 'red tutu' }));
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ favorites: ['Alice'], dancerNotes: { 's::2::Alice': 'bow' } }),
    });

    const mockUser = { uid: 'u11', email: 'fan@example.com' };
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    // Account data loads; guest data is NOT merged yet — the prompt is shown.
    expect(captured.syncPromptOpen).toBe(true);
    expect(captured.syncPromptCounts).toEqual({ favorites: 1, notes: 1 });
    expect(captured.favorites.has('Alice')).toBe(true);
    expect(captured.favorites.has('Bob')).toBe(false);
    expect(localStorage.getItem('guestFavorites')).not.toBeNull();
  });

  it('confirmSync merges guest data into the profile and clears local storage', async () => {
    localStorage.setItem('guestFavorites', JSON.stringify(['Bob']));
    localStorage.setItem('guestDancerNotes', JSON.stringify({ 's::1::Bob': 'red tutu' }));
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ favorites: ['Alice'], dancerNotes: { 's::2::Alice': 'bow' } }),
    });

    const mockUser = { uid: 'u12', email: 'fan@example.com' };
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    setDoc.mockClear();
    await act(async () => {
      await captured.confirmSync();
    });

    expect(captured.syncPromptOpen).toBe(false);
    expect(captured.favorites.has('Alice')).toBe(true);
    expect(captured.favorites.has('Bob')).toBe(true);
    expect(captured.dancerNotes['s::1::Bob']).toBe('red tutu');
    expect(captured.dancerNotes['s::2::Alice']).toBe('bow');
    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        { type: 'docRef' },
        expect.objectContaining({ favorites: expect.arrayContaining(['Alice', 'Bob']) }),
        { merge: true }
      );
    });
    expect(localStorage.getItem('guestFavorites')).toBeNull();
    expect(localStorage.getItem('guestDancerNotes')).toBeNull();
  });

  it('dismissSync keeps account data unchanged and retains guest storage', async () => {
    localStorage.setItem('guestFavorites', JSON.stringify(['Bob']));
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ favorites: ['Alice'] }),
    });

    const mockUser = { uid: 'u13', email: 'fan@example.com' };
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    await act(async () => {
      captured.dismissSync();
    });

    expect(captured.syncPromptOpen).toBe(false);
    expect(captured.favorites.has('Alice')).toBe(true);
    expect(captured.favorites.has('Bob')).toBe(false);
    // Guest data is left on the device for the next logged-out session.
    expect(JSON.parse(localStorage.getItem('guestFavorites'))).toEqual(['Bob']);
  });

  it('dismissSync(true) suppresses the prompt on the next login', async () => {
    localStorage.setItem('guestFavorites', JSON.stringify(['Bob']));
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ favorites: ['Alice'] }) });

    const mockUser = { uid: 'u14', email: 'fan@example.com' };
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(mockUser); });
    await act(async () => { captured.dismissSync(true); });
    expect(localStorage.getItem('syncPromptDismissed')).toBe('true');

    // Simulate logout then a fresh login — the prompt must not reopen.
    await act(async () => { authCallback(null); });
    await act(async () => { authCallback(mockUser); });

    expect(captured.syncPromptOpen).toBe(false);
    // ...but the data is still flagged as present for the manual Sync button.
    expect(captured.guestDataPresent).toBe(true);
  });

  it('openSyncPrompt re-opens the prompt manually even after opting out', async () => {
    localStorage.setItem('guestFavorites', JSON.stringify(['Bob']));
    localStorage.setItem('syncPromptDismissed', 'true');
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ favorites: ['Alice'] }) });

    const mockUser = { uid: 'u15', email: 'fan@example.com' };
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(mockUser); });
    // Auto-prompt suppressed by the opt-out flag.
    expect(captured.syncPromptOpen).toBe(false);

    await act(async () => { captured.openSyncPrompt(); });
    expect(captured.syncPromptOpen).toBe(true);
    expect(captured.syncPromptManual).toBe(true);
    expect(captured.syncPromptCounts).toEqual({ favorites: 1, notes: 0 });
  });

  it('tracks guestDataPresent as a logged-out user adds favorites', async () => {
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(null); });
    expect(captured.guestDataPresent).toBe(false);

    await act(async () => { await captured.toggleFavorite('Alice'); });
    expect(captured.guestDataPresent).toBe(true);
  });

  it('adds a dancer to favorites when not already present', async () => {
    const mockUser = { uid: 'u7', email: 'fan@example.com' };
    getDoc.mockResolvedValue({ exists: () => false });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    await act(async () => {
      await captured.toggleFavorite('Alice');
    });

    expect(captured.favorites.has('Alice')).toBe(true);
  });

  it('removes a dancer from favorites when already present', async () => {
    const mockUser = { uid: 'u8', email: 'fan@example.com' };
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ favorites: ['Alice'] }),
    });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    await act(async () => {
      await captured.toggleFavorite('Alice');
    });

    expect(captured.favorites.has('Alice')).toBe(false);
  });

  it('persists updated favorites array to Firestore', async () => {
    const mockUser = { uid: 'u9', email: 'fan@example.com' };
    getDoc.mockResolvedValue({ exists: () => false });
    setDoc.mockClear();

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    setDoc.mockClear(); // clear the login upsert call

    await act(async () => {
      await captured.toggleFavorite('Bob');
    });

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        { type: 'docRef' },
        { favorites: ['Bob'] },
        { merge: true }
      );
    });
  });

  it('handles toggling empty-string dancer name without crashing', async () => {
    const mockUser = { uid: 'u10', email: 'fan@example.com' };
    getDoc.mockResolvedValue({ exists: () => false });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => {
      authCallback(mockUser);
    });

    await act(async () => {
      await captured.toggleFavorite('');
    });

    expect(captured.favorites.has('')).toBe(true);
  });
});

// Single-studio mode is the default in tests (no VITE_MULTI_STUDIO set),
// so the org auto-resolution chain of ADR-002 is exercised directly.
describe('AppContext single-studio org resolution', () => {
  let authCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    onAuthStateChanged.mockImplementation((auth, cb) => {
      authCallback = cb;
      return vi.fn();
    });
    // Resolved orgs must have a backing doc, or the phantom-org guard clears them
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ name: 'Test Studio', admins: [] }) });
    setDoc.mockResolvedValue(undefined);
  });

  it('auto-resolves to the first organization sorted by id', async () => {
    getDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'zeta-dance' }, { id: 'alpha-studio' }],
    });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(null); });

    await waitFor(() => expect(captured.orgId).toBe('alpha-studio'));
    expect(captured.orgResolveAttempted).toBe(true);
  });

  it('marks resolution attempted with no org when the collection is empty', async () => {
    getDocs.mockResolvedValue({ empty: true, docs: [] });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(null); });

    await waitFor(() => expect(captured.orgResolveAttempted).toBe(true));
    expect(captured.orgId).toBeNull();
  });

  it('prefers a stored localStorage org and skips the organizations fetch', async () => {
    localStorage.setItem('selectedOrgId', 'stored-studio');

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(null); });

    expect(captured.orgId).toBe('stored-studio');
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('clears a stored orgId whose org doc no longer exists and recovers via auto-resolve', async () => {
    localStorage.setItem('selectedOrgId', 'ghost-studio');
    // 1st getDoc: ghost-studio missing → guard clears; later fetches exist
    getDoc.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
    getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'real-studio' }] });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(null); });

    await waitFor(() => expect(captured.orgId).toBe('real-studio'));
  });

  it('re-resolves after the org is cleared (e.g. dev-tools teardown)', async () => {
    getDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'only-studio' }],
    });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(null); });
    await waitFor(() => expect(captured.orgId).toBe('only-studio'));

    await act(async () => { captured.setOrgId(null); });

    await waitFor(() => expect(captured.orgId).toBe('only-studio'));
  });
});
