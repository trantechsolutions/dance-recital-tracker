// Notifications only. This worker deliberately has no fetch handler and caches
// nothing, so it can never serve a stale app. It exists because Android Chrome
// will only show a notification through a service worker.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Tapping an alert brings the app forward (or opens it).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find(w => w.url.startsWith(self.registration.scope));
    if (open) { await open.focus(); return; }
    await self.clients.openWindow(target);
  })());
});
