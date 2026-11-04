/* Elo alerts for staff and guests: shows Web Push notifications and opens the right page on tap. */

// Texts come from app/_lib/messages/alerts.ts, served by app/push-messages.js/route.ts.
importScripts('/push-messages.js');

const APP_NAME = 'Elo';
const ICON = '/icon-192.png';
const BADGE = '/badge-96.png';
const VIBRATION = [180, 80, 180];

const fill = (template, params) =>
    template.replace(/\{(\w+)\}/g, (match, key) => params[key] ?? match);

/** Same rendering as `staffAlertText` and `guestAlertText` in the app. */
function render({ audience, kind, params = {} }) {
    const messages = self.ELO_ALERT_MESSAGES;
    const template = messages?.[audience]?.[kind];
    if (!template) return { title: APP_NAME, body: '' };
    const values = {
        table: params.table || messages.fallbacks.table,
        who: params.who || messages.fallbacks.who,
        items: (params.items || [])
            .map((item) => fill(messages.orderItem, item))
            .join(messages.itemSeparator)
    };
    return {
        title: fill(template.title, values),
        body:
            template.emptyBody && values.items === ''
                ? template.emptyBody
                : fill(template.body, values)
    };
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = {};
    }
    const { title, body } = render(data);
    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            tag: data.tag,
            renotify: Boolean(data.tag),
            icon: ICON,
            badge: BADGE,
            vibrate: VIBRATION,
            data: { url: data.url || '/' }
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((windows) => {
                const same =
                    windows.find((w) => w.url === url) ||
                    windows.find((w) => new URL(w.url).origin === self.location.origin);
                if (same) {
                    if (same.url !== url && 'navigate' in same) same.navigate(url);
                    return same.focus();
                }
                return self.clients.openWindow(url);
            })
    );
});
