// "Alert me when my dancer is close": a phone notification at 3 acts away and
// again at "up next". Shown by this page while it's open (including in the
// background), via a notifications-only service worker.
//
// Limits: if the browser has suspended the page (often on a locked iPhone, or
// after a long time in the background) nothing fires. Alerts that reach a
// fully locked phone need server push (a Cloud Function on show_status plus
// Firebase Cloud Messaging), which this does not include.

const KEY = 'actAlerts_v1';
const SW_URL = `${import.meta.env.BASE_URL || '/'}notify-sw.js`;

export const alertsSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export const alertsEnabled = () => {
  try { return alertsSupported() && Notification.permission === 'granted' && localStorage.getItem(KEY) === '1'; }
  catch { return false; }
};

export const alertsBlocked = () => alertsSupported() && Notification.permission === 'denied';

async function registration() {
  return navigator.serviceWorker.getRegistration(SW_URL)
    .then(reg => reg || navigator.serviceWorker.register(SW_URL));
}

// Ask once, from a tap. Returns true when alerts are on.
export async function enableAlerts() {
  if (!alertsSupported()) return false;
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return false;
  try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ }
  await registration().catch(() => {});
  window.dispatchEvent(new Event('recital-alerts-change'));
  return true;
}

export function disableAlerts() {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
  window.dispatchEvent(new Event('recital-alerts-change'));
}

export async function sendAlert(title, body, tag) {
  if (!alertsEnabled()) return;
  const options = { body, tag, renotify: true, icon: `${import.meta.env.BASE_URL || '/'}icon-192.png`, data: { url: './my-night' } };
  try {
    const reg = await registration();
    await reg.showNotification(title, options);
  } catch {
    try { new Notification(title, options); } catch { /* not allowed here */ }
  }
}

// Which alert (if any) this moment deserves: 'three' at 3 acts away, 'next'
// when up next. Pure, so it can be tested.
export function alertStage(status) {
  if (!status?.tracking || !status.target) return null;
  if (status.phase === 'next') return 'next';
  if ((status.phase === 'soon' || status.phase === 'later') && status.actsAway <= 3) return 'three';
  return null;
}
