/* Elo alerts for staff and guests: shows Web Push notifications and opens the right page on tap. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : 'Elo' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Elo', {
      body: data.body || '',
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      vibrate: [180, 80, 180],
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const same = windows.find((w) => w.url === url) || windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (same) {
        if (same.url !== url && 'navigate' in same) same.navigate(url);
        return same.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
