import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { serviceOrigin } from './origin';

export type RealtimeHandlers = Record<string, (payload: never) => void>;

/**
 * `rejected`: the server refused the credential (expired token, suspended
 * restaurant, closed table session). The socket stops retrying.
 */
export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'rejected';

export type RealtimeRejection = 'expired' | 'invalid' | 'suspended' | 'session';

interface Connection {
  socket: Socket;
  refs: number;
  status: RealtimeStatus;
  rejection: RealtimeRejection | null;
  statusListeners: Set<() => void>;
  resyncListeners: Set<() => void>;
  dispose: () => void;
}

/** A tab hidden for longer than this may have missed events while frozen, even if the socket looks alive. */
const STALE_AFTER_HIDDEN_MS = 15_000;
const connections = new Map<string, Connection>();

/**
 * One socket per credential, shared by every hook on the page. It keeps the
 * screen consistent across drops: every reconnect, return to the tab or
 * return of the network triggers a resync, since events sent while the
 * socket was down are lost.
 */
function acquire(token: string | null | undefined): Connection {
  const key = token ?? 'table';
  const existing = connections.get(key);
  if (existing) {
    existing.refs++;
    return existing;
  }

  const socket = io(serviceOrigin(3001, process.env.NEXT_PUBLIC_API_URL), {
    withCredentials: true,
    auth: token ? { token } : {},
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });

  let everConnected = false;
  let manualRetry: ReturnType<typeof setTimeout> | undefined;
  let manualAttempts = 0;
  let hiddenAt: number | null = null;

  const conn: Connection = {
    socket,
    refs: 1,
    status: 'connecting',
    rejection: null,
    statusListeners: new Set(),
    resyncListeners: new Set(),
    dispose: () => undefined,
  };

  const setStatus = (status: RealtimeStatus) => {
    if (conn.status === status) return;
    conn.status = status;
    conn.statusListeners.forEach((l) => l());
  };
  const resync = () => conn.resyncListeners.forEach((l) => l());

  const reconnectNow = () => {
    if (conn.status === 'rejected' || socket.connected) return;
    clearTimeout(manualRetry);
    socket.connect();
  };

  socket.on('connect', () => {
    clearTimeout(manualRetry);
    manualAttempts = 0;
    setStatus('connected');
    if (everConnected) resync();
    everConnected = true;
  });

  socket.on('auth_error', (reason: RealtimeRejection) => {
    conn.rejection = reason;
    setStatus('rejected');
    resync();
  });

  socket.on('disconnect', (reason) => {
    if (conn.status === 'rejected') return;
    setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'reconnecting');
    // socket.io gives up after a server-side disconnect (API restart, deploy); retry with backoff.
    if (reason === 'io server disconnect') {
      const delay = Math.min(1000 * 2 ** manualAttempts++, 15_000);
      manualRetry = setTimeout(reconnectNow, delay);
    }
  });

  socket.on('connect_error', () => {
    if (conn.status !== 'rejected') setStatus(navigator.onLine ? 'reconnecting' : 'offline');
  });

  const onOnline = () => {
    setStatus('reconnecting');
    reconnectNow();
  };
  const onOffline = () => setStatus('offline');
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    const wasHiddenFor = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    if (!socket.connected) reconnectNow();
    else if (wasHiddenFor > STALE_AFTER_HIDDEN_MS) resync();
  };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisibility);

  conn.dispose = () => {
    clearTimeout(manualRetry);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisibility);
    socket.disconnect();
    connections.delete(key);
  };

  connections.set(key, conn);
  return conn;
}

function release(conn: Connection) {
  if (--conn.refs === 0) conn.dispose();
}

export interface RealtimeOptions {
  /** Reloads the screen's data after a gap in which events may have been lost. */
  onResync?: () => void;
}

/**
 * Subscribes to API events. Staff pass `token` (JWT); a table guest passes
 * nothing and authenticates with the session cookie.
 */
export function useRealtime(
  handlers: RealtimeHandlers,
  token?: string | null,
  enabled = true,
  options: RealtimeOptions = {},
): RealtimeStatus {
  const ref = useRef(handlers);
  ref.current = handlers;
  const resyncRef = useRef(options.onResync);
  resyncRef.current = options.onResync;
  const [status, setStatus] = useState<RealtimeStatus>('connecting');

  useEffect(() => {
    if (!enabled) return;
    const conn = acquire(token);
    const bound = Object.keys(ref.current).map((ev) => {
      const fn = (p: unknown) => ref.current[ev]?.(p as never);
      conn.socket.on(ev, fn);
      return [ev, fn] as const;
    });
    const onStatus = () => setStatus(conn.status);
    const onResync = () => resyncRef.current?.();
    conn.statusListeners.add(onStatus);
    conn.resyncListeners.add(onResync);
    onStatus();
    return () => {
      for (const [ev, fn] of bound) conn.socket.off(ev, fn);
      conn.statusListeners.delete(onStatus);
      conn.resyncListeners.delete(onResync);
      release(conn);
    };
  }, [token, enabled]);

  return status;
}

/** Connection state of the shared socket, for a header indicator. */
export function useRealtimeStatus(token?: string | null, enabled = true): RealtimeStatus {
  return useRealtime({}, token, enabled);
}
