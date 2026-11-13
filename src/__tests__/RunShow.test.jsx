import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RunShow from '../components/admin/RunShow';

let canRun = true;
vi.mock('../context/AppContext', () => ({
  useApp: () => ({ canRunShow: () => canRun }),
}));
// The microphone is out of scope here.
vi.mock('../hooks/useListeningAssist', () => ({
  useListeningAssist: () => ({ status: 'off', error: null, level: 0, kind: 'quiet', reset: () => {} }),
}));

const recitalData = {
  s1: { id: 's1', label: 'Metairie, Sat 12pm', acts: [
    { number: 1, title: 'New York New York', performers: [] },
    { number: 2, title: 'Earthquake', performers: [] },
    { number: 4, title: 'Voulez-Vous', performers: [] },
  ] },
};

function renderRun(currentAct, overrides = {}) {
  const props = {
    recitalData,
    currentAct,
    actLog: [],
    updateActNumber: vi.fn(() => Promise.resolve()),
    setShowPhase: vi.fn(),
    selectedShow: 's1',
    setSelectedShow: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter initialEntries={['/admin/run/s1']}>
      <Routes>
        <Route path="/admin/run/:showId" element={<RunShow {...props} />} />
        <Route path="/admin" element={<p>admin home</p>} />
        <Route path="/" element={<p>program</p>} />
      </Routes>
    </MemoryRouter>
  );
  return props;
}

describe('RunShow', () => {
  beforeEach(() => { canRun = true; localStorage.clear(); });

  it('starts the show at the first act', async () => {
    const p = renderRun({ number: 1, title: 'Not Started', isTracking: false });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start the show' })); });
    expect(p.updateActNumber).toHaveBeenCalledWith(1);
  });

  it('Next steps by position across a numbering gap', async () => {
    const p = renderRun({ number: 2, title: 'Earthquake', isTracking: true });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Next act/ })); });
    expect(p.updateActNumber).toHaveBeenCalledWith(4);
  });

  it('a clicker’s Page Down / Page Up move next and back', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);
    const p = renderRun({ number: 2, title: 'Earthquake', isTracking: true });
    await act(async () => { fireEvent.keyDown(window, { key: 'PageDown' }); });
    expect(p.updateActNumber).toHaveBeenLastCalledWith(4);
    now.mockReturnValue(1_000_000 + 2000);
    await act(async () => { fireEvent.keyDown(window, { key: 'PageUp' }); });
    expect(p.updateActNumber).toHaveBeenLastCalledWith(1);
    now.mockRestore();
  });

  it('ignores an accidental double tap on Next', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(2_000_000);
    const p = renderRun({ number: 1, title: 'New York New York', isTracking: true });
    const next = screen.getByRole('button', { name: /Next act/ });
    await act(async () => { fireEvent.click(next); });
    now.mockReturnValue(2_000_000 + 400);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Next act/ })); });
    expect(p.updateActNumber).toHaveBeenCalledTimes(1);
    now.mockRestore();
  });

  it('starts an intermission and resumes with the next act', async () => {
    const p = renderRun({ number: 1, title: 'New York New York', isTracking: true });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Intermission' })); });
    expect(p.setShowPhase).toHaveBeenCalledWith('intermission');
  });

  it('during intermission, offers the second half', async () => {
    const p = renderRun({ number: 2, title: 'Earthquake', isTracking: true, phase: 'intermission' });
    expect(screen.getByRole('heading', { name: 'Intermission' })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Start the second half/ })); });
    expect(p.updateActNumber).toHaveBeenCalledWith(4);
  });

  it('offers Undo after a move, which goes back without a new Undo', async () => {
    const p = renderRun({ number: 1, title: 'New York New York', isTracking: true });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Next act/ })); });
    expect(screen.getByText('Moved to act 2')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Undo' })); });
    expect(p.updateActNumber).toHaveBeenLastCalledWith(1);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('on the last act, the big button ends the show after a confirmation', async () => {
    const p = renderRun({ number: 4, title: 'Voulez-Vous', isTracking: true });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /End the show/ })); });
    expect(p.setShowPhase).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog', { name: 'End the show?' });
    await act(async () => { fireEvent.click(within(dialog).getByRole('button', { name: 'End the show' })); });
    expect(p.setShowPhase).toHaveBeenCalledWith('ended');
  });

  it('sends people without access back to the program', () => {
    canRun = false;
    renderRun({ number: 1, title: '', isTracking: true });
    expect(screen.getByText('program')).toBeInTheDocument();
  });
});
