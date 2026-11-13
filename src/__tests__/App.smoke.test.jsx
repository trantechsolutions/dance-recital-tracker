import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Renders the real App shell. Catches render-time crashes in App itself, such
// as a hook's dependency list reading a value declared further down.
let ctx;
vi.mock('../context/AppContext', () => ({ useApp: () => ctx }));
vi.mock('../hooks/useLiveTracker', () => ({
  useLiveTracker: () => ({
    recitalData: { s1: { id: 's1', label: 'Sat 12pm', acts: [{ number: 1, title: 'Opening', performers: ['Ava K.'] }] } },
    currentAct: { number: 1, title: 'Opening', isTracking: true, startedAt: null, phase: null },
    actLog: [], loading: false, liveShowId: 's1',
    setRecitalData: vi.fn(), invalidateActsCache: vi.fn(), updateActNumber: vi.fn(),
    setShowPhase: vi.fn(), toggleTracking: vi.fn(),
  }),
}));

const baseCtx = (over = {}) => ({
  user: null, isAuthorized: false, isSuperAdmin: false, isAuthChecking: false,
  isShowRunner: false, runnerShows: null, canRunShow: () => false, canViewFullNames: false,
  favorites: new Set(['Ava K.']), toggleFavorite: vi.fn(), dancerNotes: {}, setDancerNote: vi.fn(),
  orgId: 'dp', setOrgId: vi.fn(), orgName: 'Studio', orgResolveAttempted: true,
  studioCode: '', studioUnlocked: true, submitStudioCode: vi.fn(), studioCodeReady: true,
  loginPromptOpen: false, setLoginPromptOpen: vi.fn(),
  syncPromptOpen: false, syncPromptManual: false, confirmSync: vi.fn(), dismissSync: vi.fn(), syncPromptCounts: {},
  showTutorial: false, tutorialVariant: 'general', openTutorial: vi.fn(), dismissTutorial: vi.fn(),
  clearSkipLogin: vi.fn(), guestDataPresent: false, openSyncPrompt: vi.fn(),
  ...over,
});

describe('App shell', () => {
  it('renders the sign-in screen when signed out', () => {
    ctx = baseCtx();
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByText(/Sign in to see the running order/)).toBeInTheDocument();
  });

  it('renders the live program when signed in', async () => {
    localStorage.setItem('welcomeDone_v1', 'x');
    ctx = baseCtx({ user: { email: 'p@x.com', uid: 'u1' } });
    render(<MemoryRouter><App /></MemoryRouter>);
    // The live show is picked just after the first render.
    expect((await screen.findAllByText('Opening')).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Ava K\. is on stage now/)).toBeInTheDocument();
  });
});
