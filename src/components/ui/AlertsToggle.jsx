import React, { useEffect, useState } from 'react';
import { alertsSupported, alertsEnabled, alertsBlocked, enableAlerts, disableAlerts } from '../../utils/alerts';

// Turn phone alerts on or off. `variant="card"` is the prompt on My night;
// the default is a settings row.
export default function AlertsToggle({ variant = 'row', who = 'your dancer' }) {
  const [on, setOn] = useState(alertsEnabled);
  const [blocked, setBlocked] = useState(alertsBlocked);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => { setOn(alertsEnabled()); setBlocked(alertsBlocked()); };
    window.addEventListener('recital-alerts-change', sync);
    return () => window.removeEventListener('recital-alerts-change', sync);
  }, []);

  if (!alertsSupported()) {
    return variant === 'row'
      ? <p className="text-xs text-ink-500 dark:text-ink-400 px-0.5">This browser can&rsquo;t show alerts. On iPhone, add the app to your Home Screen first.</p>
      : null;
  }

  const turnOn = async () => {
    setBusy(true);
    const ok = await enableAlerts();
    setBusy(false);
    setOn(ok);
    setBlocked(alertsBlocked());
  };

  const note = 'Works while this app is open, even in the background. Keep the tab open during the show.';

  if (variant === 'card') {
    if (on) return null;
    return (
      <div className="p-4 rounded-card border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 space-y-2">
        <p className="text-sm font-semibold dark:text-white">Get an alert when {who} is 3 acts away</p>
        <p className="text-xs text-ink-500 dark:text-ink-400">{blocked ? 'Alerts are blocked for this site. Allow notifications in your browser settings, then try again.' : note}</p>
        {!blocked && (
          <button onClick={turnOn} disabled={busy} className="h-11 px-4 rounded-card bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-semibold disabled:opacity-50">
            Turn on alerts
          </button>
        )}
      </div>
    );
  }

  return (
    <label className="flex items-center justify-between gap-3 min-h-[52px] px-0.5 cursor-pointer">
      <span>
        <span className="block text-[15px] dark:text-white">Alert me when my dancer is close</span>
        <span className="block text-xs text-ink-500 dark:text-ink-400">
          {blocked ? 'Blocked for this site. Allow notifications in your browser settings.' : `At 3 acts away and again when up next. ${note}`}
        </span>
      </span>
      <input
        type="checkbox"
        checked={on}
        disabled={busy || blocked}
        onChange={() => (on ? (disableAlerts(), setOn(false)) : turnOn())}
        className="w-5 h-5 accent-pink-600 shrink-0"
      />
    </label>
  );
}
