import { api } from './api';

/**
 * - `unsupported`: this browser cannot receive push (on iPhone, the panel must
 *   be added to the home screen first).
 * - `unavailable`: the server has no push keys configured.
 * - `denied`: the person blocked notifications for the site.
 */
export type PushState = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on';

const SW_URL = '/sw.js';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Installed to the home screen (needed for push on iPhone). */
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

async function registration() {
  return (await navigator.serviceWorker.getRegistration(SW_URL)) ?? navigator.serviceWorker.register(SW_URL);
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/**
 * Asks for permission (must run from a tap), subscribes this device and
 * registers it for the signed-in member. Re-running refreshes the server copy.
 */
export async function enablePush(token: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const { key } = await api<{ key: string | null }>('/api/push/public-key', { token });
  if (!key) return 'unavailable';
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const applicationServerKey = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  let sub = await reg.pushManager.getSubscription();
  // A subscription made with other server keys cannot be reused.
  const current = sub?.options.applicationServerKey;
  if (sub && current && btoa(String.fromCharCode(...new Uint8Array(current))) !== btoa(String.fromCharCode(...applicationServerKey))) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await api('/api/push/subscriptions', { body: { endpoint: json.endpoint, keys: json.keys }, token });
  return 'on';
}

/** Stops alerts on this device: on sign-out, so the next person does not get them. */
export async function disablePush(token: string | null): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  if (token) await api('/api/push/subscriptions', { method: 'DELETE', body: { endpoint: sub.endpoint }, token }).catch(() => undefined);
  await sub.unsubscribe().catch(() => undefined);
}
