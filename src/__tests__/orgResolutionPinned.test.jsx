import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, getDocs, setDoc } from 'firebase/firestore';
import { AppProvider, useApp } from '../context/AppContext';

// Pin the tenant via config — covers the VITE_DEFAULT_ORG_ID branch of ADR-002.
vi.mock('../config', () => ({
  MULTI_STUDIO_ENABLED: false,
  DEFAULT_ORG_ID: 'pinned-studio',
}));

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

describe('AppContext with DEFAULT_ORG_ID pinned', () => {
  let authCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    onAuthStateChanged.mockImplementation((auth, cb) => {
      authCallback = cb;
      return vi.fn();
    });
    // The pinned org's doc exists by default; the misconfig test overrides this
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ name: 'Pinned Studio', admins: [] }) });
    setDoc.mockResolvedValue(undefined);
  });

  it('uses the pinned org without fetching organizations', async () => {
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(null); });

    expect(captured.orgId).toBe('pinned-studio');
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('overrides a stale localStorage org from a prior multi-studio session', async () => {
    localStorage.setItem('selectedOrgId', 'old-seeded-studio');

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(null); });

    expect(captured.orgId).toBe('pinned-studio');
  });

  it('restores the pinned org after the org is cleared', async () => {
    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(null); });
    await act(async () => { captured.setOrgId(null); });

    await waitFor(() => expect(captured.orgId).toBe('pinned-studio'));
    expect(captured.orgResolveAttempted).toBe(true);
  });

  it('falls back to auto-resolution when the pinned org doc does not exist', async () => {
    // pinned-studio doc missing → guard flags the bad default and clears
    getDoc.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
    getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'real-studio' }] });

    let captured;
    renderWithProvider(ctx => { captured = ctx; });

    await act(async () => { authCallback(null); });

    await waitFor(() => expect(captured.orgId).toBe('real-studio'));
  });
});
