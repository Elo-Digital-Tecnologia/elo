import type { Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { serviceOrigin } from '../origin/service-origin';

export type RealtimeHandlers = Record<string, (payload: never) => void>;

/**
 * `connected` means the server has put the socket in its rooms (`ready`), not
 * just that the transport is up. `rejected`: the server refused the credential
 * (expired token, suspended restaurant, closed table session).
 */
export type RealtimeStatus =
    'connecting' | 'connected' | 'reconnecting' | 'offline' | 'rejected';

export type RealtimeRejection = 'expired' | 'invalid' | 'suspended' | 'session';

interface Connection {
    socket: Socket;
    refs: number;
    status: RealtimeStatus;
    rejection: RealtimeRejection | null;
    statusListeners: Set<() => void>;
    resyncListeners: Set<() => void>;
    setTicket: (ticket: string | null | undefined) => void;
    dispose: () => void;
}

/** How long the server has to answer a liveness check; two misses in a row mean the socket is dead. */
const ALIVE_TIMEOUT_MS = 8000;
const ALIVE_MISSES = 2;
/** Liveness checks while the page is in view: a half-open socket otherwise looks alive for over a minute. */
const ALIVE_EVERY_MS = 20_000;
/** A refused table session is tried again this many times, in case the refusal came from a stale credential. */
const SESSION_RETRIES = 3;
const DEFAULT_POLL_MS = 10_000;
const connections = new Map<string, Connection>();

/**
 * One socket per credential, shared by every hook on the page. Events sent
 * while the socket is not in its rooms are lost, so the screen reloads its
 * data whenever the server confirms the socket is in (`ready`), on every
 * return to the page, and the socket is checked for life while in view.
 */
function acquire(
    token: string | null | undefined,
    ticket: string | null | undefined
): Connection {
    const key = token ?? 'table';
    const existing = connections.get(key);
    if (existing) {
        existing.refs++;
        existing.setTicket(ticket);
        return existing;
    }

    let currentTicket = ticket ?? null;
    const socket = io(serviceOrigin(3001, process.env.NEXT_PUBLIC_API_URL), {
        withCredentials: true,
        auth: (cb) =>
            cb(token ? { token } : currentTicket ? { ticket: currentTicket } : {}),
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000
    });

    let manualRetry: ReturnType<typeof setTimeout> | undefined;
    let manualAttempts = 0;
    let sessionRetry: ReturnType<typeof setTimeout> | undefined;
    let sessionAttempts = 0;
    let probing = false;
    let misses = 0;

    const conn: Connection = {
        socket,
        refs: 1,
        status: 'connecting',
        rejection: null,
        statusListeners: new Set(),
        resyncListeners: new Set(),
        setTicket: (t) => {
            currentTicket = t ?? null;
        },
        dispose: () => undefined
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

    /** Asks the server for an answer; a slow link may miss one, but repeated silence means the socket is dead, so it starts over. */
    const probe = () => {
        if (conn.status === 'rejected') return;
        if (!socket.connected) return reconnectNow();
        if (probing) return;
        probing = true;
        socket.timeout(ALIVE_TIMEOUT_MS).emit('alive', (err: Error | null) => {
            probing = false;
            if (!err) misses = 0;
            if (!err || !socket.connected || ++misses < ALIVE_MISSES) return;
            misses = 0;
            socket.disconnect();
            setStatus('reconnecting');
            socket.connect();
        });
    };

    socket.on('connect', () => {
        clearTimeout(manualRetry);
        manualAttempts = 0;
    });

    socket.on('ready', () => {
        sessionAttempts = 0;
        setStatus('connected');
        resync();
    });

    socket.on('auth_error', (reason: RealtimeRejection) => {
        conn.rejection = reason;
        setStatus('rejected');
        resync();
        // The page reloads its session on the resync: a session still alive hands over a fresh ticket for the next try.
        if (!token && reason === 'session' && sessionAttempts < SESSION_RETRIES) {
            sessionRetry = setTimeout(
                () => {
                    conn.rejection = null;
                    setStatus('reconnecting');
                    socket.connect();
                },
                2000 * 2 ** sessionAttempts++
            );
        }
    });

    socket.on('disconnect', (reason) => {
        if (conn.status === 'rejected') return;
        setStatus(
            typeof navigator !== 'undefined' && !navigator.onLine
                ? 'offline'
                : 'reconnecting'
        );
        // socket.io gives up after a server-side disconnect (API restart, deploy); retry with backoff.
        if (reason === 'io server disconnect') {
            const delay = Math.min(1000 * 2 ** manualAttempts++, 15_000);
            manualRetry = setTimeout(reconnectNow, delay);
        }
    });

    socket.on('connect_error', () => {
        if (conn.status !== 'rejected')
            setStatus(navigator.onLine ? 'reconnecting' : 'offline');
    });

    const onOnline = () => {
        if (socket.connected) return probe();
        setStatus('reconnecting');
        reconnectNow();
    };
    const onOffline = () => setStatus('offline');
    const onVisibility = () => {
        if (document.visibilityState !== 'visible') return;
        if (!socket.connected) return reconnectNow();
        probe();
        // A phone freezes hidden pages: events may have been missed even with the socket alive.
        resync();
    };
    const heartbeat = setInterval(() => {
        if (document.visibilityState === 'visible') probe();
    }, ALIVE_EVERY_MS);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', probe);
    document.addEventListener('visibilitychange', onVisibility);

    conn.dispose = () => {
        clearTimeout(manualRetry);
        clearTimeout(sessionRetry);
        clearInterval(heartbeat);
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        window.removeEventListener('focus', probe);
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
    /** Table guest credential for the socket, from the session state. */
    ticket?: string | null;
    /**
     * While the socket is not connected, `onResync` runs at this interval (ms), so
     * the screen keeps up over plain HTTP. Defaults to 10 s when `onResync` is
     * given; 0 turns it off.
     */
    pollWhileDown?: number;
}

/**
 * Subscribes to API events. Staff pass `token` (JWT); a table guest passes
 * nothing and authenticates with `options.ticket` (or the session cookie).
 */
export function useRealtime(
    handlers: RealtimeHandlers,
    token?: string | null,
    enabled = true,
    options: RealtimeOptions = {}
): RealtimeStatus {
    const ref = useRef(handlers);
    ref.current = handlers;
    const resyncRef = useRef(options.onResync);
    resyncRef.current = options.onResync;
    const ticketRef = useRef(options.ticket);
    ticketRef.current = options.ticket;
    const connRef = useRef<Connection | null>(null);
    const [status, setStatus] = useState<RealtimeStatus>('connecting');
    const poll = options.pollWhileDown ?? (options.onResync ? DEFAULT_POLL_MS : 0);

    useEffect(() => {
        if (!enabled) return;
        const conn = acquire(token, ticketRef.current);
        connRef.current = conn;
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
            connRef.current = null;
            release(conn);
        };
    }, [token, enabled]);

    useEffect(() => {
        connRef.current?.setTicket(options.ticket);
    }, [options.ticket]);

    useEffect(() => {
        if (!enabled || !poll || status === 'connected') return;
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') resyncRef.current?.();
        }, poll);
        return () => clearInterval(timer);
    }, [enabled, poll, status]);

    return status;
}

/** Connection state of the shared socket, for a header indicator. */
export function useRealtimeStatus(token?: string | null, enabled = true): RealtimeStatus {
    return useRealtime({}, token, enabled);
}
