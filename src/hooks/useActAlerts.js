import { useEffect } from 'react';
import { alertStage, alertsEnabled, sendAlert } from '../utils/alerts';
import { liveInstruction } from '../utils/liveProgress';

// Fires each alert once per show, act and stage (remembered for the visit so
// a reload doesn't repeat it).
export function useActAlerts({ status, showId, showLabel, nameFn, eta }) {
  const stage = alertStage(status);
  const targetNumber = status?.target?.number;

  useEffect(() => {
    if (!stage || !alertsEnabled() || targetNumber == null) return;
    const key = `alerted:${showId}:${targetNumber}:${stage}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { /* private mode: may repeat, acceptable */ }
    const body = liveInstruction(status, nameFn, eta) || '';
    const title = stage === 'next' ? 'Up next' : `${status.actsAway} acts to go`;
    sendAlert(`${title}: act ${targetNumber}`, `${body}${showLabel ? `\n${showLabel}` : ''}`, `act-${showId}-${targetNumber}`);
    // status/nameFn/eta are read for the message only; the key above decides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, showId, targetNumber]);
}
