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
 * Asks for permission (must run from a tap) and subscribes this device with the
 * server's key. Null when push cannot be turned on, with the reason as state.
 */
async function subscribeDevice(key: string | null): Promise<{ state: PushState; sub?: { endpoint: string; keys: { p256dh: string; auth: string } } }> {
  if (!key) return { state: 'unavailable' };
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return { state: permission === 'denied' ? 'denied' : 'off' };
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
  return { state: 'on', sub: { endpoint: json.endpoint, keys: json.keys } };
}

/** Registers this device for the signed-in member. Re-running refreshes the server copy. */
export async function enablePush(token: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const { key } = await api<{ key: string | null }>('/api/push/public-key', { token });
  const { state, sub } = await subscribeDevice(key);
  if (sub) await api('/api/push/subscriptions', { body: sub, token });
  return state;
}

/** Registers this device for the guest's table session (cookie); it is forgotten when the table closes. */
export async function enableGuestPush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const { key } = await api<{ key: string | null }>('/api/public/push-key');
  const { state, sub } = await subscribeDevice(key);
  if (sub) await api('/api/public/session/push', { body: sub });
  return state;
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
