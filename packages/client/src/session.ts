import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, UNAUTHORIZED_EVENT, api } from './api';

const KEY = 'elo.token';
/** Cada área guarda o próprio token: o painel Elo e o de cada restaurante não se misturam. */
const keyOf = (scope: string) => `${KEY}.${scope}`;
/** The API's name for an area: the Elo panel, or a restaurant panel by its link. */
const sessionScopeOf = (scope: string) => (scope === 'admin' ? 'admin' : `r:${scope}`);
/** Renew this long before the access token runs out. */
const AHEAD_MS = 5 * 60_000;

export interface TokenPayload {
    sub: string;
    roles: string[];
    /** Missing on tokens issued before team members had names. */
    name?: string;
    restaurantId: string | null;
    permissions: string[];
    /** Presente quando a equipe Elo entrou no painel do restaurante. */
    impersonatedBy?: string;
    exp: number;
}

/** The token's claims, expired or not. */
function readClaims(token: string): TokenPayload | null {
    try {
        const json = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(json) as Omit<TokenPayload, 'roles'> & {
            roles?: string[];
            role?: string;
        };
        // Tokens issued before multiple roles carry a single `role`.
        const roles = payload.roles ?? (payload.role ? [payload.role] : []);
        return { ...payload, roles };
    } catch {
        return null;
    }
}

/** The claims of a token still in force; null once it expired. */
export function decodeToken(token: string): TokenPayload | null {
    const payload = readClaims(token);
    return payload && payload.exp * 1000 > Date.now() ? payload : null;
}

/** Elo support's pass into a restaurant: it never trades the restaurant's own session cookie, even after it expired. */
const isSupport = (token: string | null) =>
    !!(token && readClaims(token)?.impersonatedBy);

function readStored(scope: string): string | null {
    try {
        return sessionStorage.getItem(keyOf(scope));
    } catch {
        return null;
    }
}

function writeStored(scope: string, token: string | null) {
    try {
        if (token) sessionStorage.setItem(keyOf(scope), token);
        else sessionStorage.removeItem(keyOf(scope));
    } catch {
        /* storage indisponível */
    }
}

/** Guarda um token já emitido para a área (usado ao abrir o painel de um restaurante a partir do admin). */
export function storeToken(scope: string, token: string) {
    writeStored(scope, token);
}

/** Outcome of asking the session cookie for a token: a new one, signed out (401), or unknown (offline, busy). */
type Renewal = { token: string } | { ended: true } | { failed: true };

/** One request per area at a time: tabs and effects asking together share it. */
const inFlight = new Map<string, Promise<Renewal>>();

function requestToken(scope: string): Promise<Renewal> {
    const running = inFlight.get(scope);
    if (running) return running;
    const next = api<{ accessToken: string }>('/api/auth/session', {
        body: { scope: sessionScopeOf(scope) }
    })
        .then((r): Renewal => ({ token: r.accessToken }))
        .catch((e): Renewal =>
            e instanceof ApiError && (e.status === 401 || e.status === 400)
                ? { ended: true }
                : { failed: true }
        )
        .finally(() => inFlight.delete(scope));
    inFlight.set(scope, next);
    return next;
}

/**
 * Staff sign-in of one area. The API keeps the session in an httpOnly cookie that
 * outlives the tab and the browser; this hook trades it for short access tokens,
 * before they run out, when the screen comes back and when a request is refused.
 * Only a refusal from the API signs out: offline or busy, the current token stays.
 */
export function useAuth(scope: string) {
    const [token, setTokenState] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const tokenRef = useRef<string | null>(null);

    const setToken = useCallback(
        (next: string | null) => {
            tokenRef.current = next;
            setTokenState(next);
            writeStored(scope, next);
        },
        [scope]
    );

    /** A fresh token from the session; null once the session is over. Elo support tokens are never renewed this way. */
    const renew = useCallback(async (): Promise<string | null> => {
        const current = tokenRef.current;
        if (isSupport(current)) {
            if (!decodeToken(current!)) setToken(null);
            return tokenRef.current;
        }
        const result = await requestToken(scope);
        if ('token' in result) setToken(result.token);
        else if ('ended' in result) setToken(null);
        return tokenRef.current;
    }, [scope, setToken]);

    useEffect(() => {
        let cancelled = false;
        const saved = readStored(scope);
        const payload = saved ? decodeToken(saved) : null;
        if (isSupport(saved)) {
            if (payload) {
                tokenRef.current = saved;
                setTokenState(saved);
            } else writeStored(scope, null);
            setReady(true);
            return;
        }
        if (saved && payload && payload.exp * 1000 - Date.now() > AHEAD_MS) {
            tokenRef.current = saved;
            setTokenState(saved);
            setReady(true);
            return;
        }
        // New tab or reopened browser: the cookie answers before the panel decides whether to show the sign-in.
        const attempt = async (n: number) => {
            const result = await requestToken(scope);
            if (cancelled) return;
            if ('failed' in result && n < 3)
                return void setTimeout(() => void attempt(n + 1), 1500 * (n + 1));
            setToken('token' in result ? result.token : payload ? saved : null);
            setReady(true);
        };
        void attempt(0);
        return () => {
            cancelled = true;
        };
    }, [scope, setToken]);

    // Renews ahead of the expiry; a try that failed (offline, API busy) comes back a minute later.
    const [retry, setRetry] = useState(0);
    const failedFor = useRef<string | null>(null);
    useEffect(() => {
        const payload = token ? decodeToken(token) : null;
        if (!payload || payload.impersonatedBy) return;
        const wait =
            failedFor.current === token
                ? 60_000
                : Math.max(payload.exp * 1000 - Date.now() - AHEAD_MS, 5_000);
        const timer = setTimeout(
            () => {
                void renew().then((next) => {
                    if (next !== token) return;
                    failedFor.current = token;
                    setRetry((n) => n + 1);
                });
            },
            Math.min(wait, 2 ** 31 - 1)
        );
        return () => clearTimeout(timer);
    }, [token, renew, retry]);

    // A laptop waking up or a phone unlocking may hold a token that ran out meanwhile.
    useEffect(() => {
        if (!ready) return;
        const check = () => {
            if (document.visibilityState === 'hidden') return;
            const payload = tokenRef.current ? decodeToken(tokenRef.current) : null;
            if (!payload || payload.exp * 1000 - Date.now() < AHEAD_MS) void renew();
        };
        const onUnauthorized = (e: Event) => {
            if ((e as CustomEvent<{ token: string }>).detail?.token === tokenRef.current)
                void renew();
        };
        document.addEventListener('visibilitychange', check);
        window.addEventListener('focus', check);
        window.addEventListener('online', check);
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => {
            document.removeEventListener('visibilitychange', check);
            window.removeEventListener('focus', check);
            window.removeEventListener('online', check);
            window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        };
    }, [ready, renew]);

    /** Signs out of this area on this browser: the session ends on the server too (Elo support only leaves). */
    const logout = useCallback(async () => {
        // The session ends on the server first, or the sign-in page could trade the cookie back for a token.
        if (!isSupport(tokenRef.current))
            await api('/api/auth/logout', {
                body: { scope: sessionScopeOf(scope) }
            }).catch(() => undefined);
        setToken(null);
    }, [scope, setToken]);

    // Referência estável: efeitos que dependem de `user` não podem rodar a cada render.
    const user = useMemo(() => (token ? decodeToken(token) : null), [token]);

    return { token, user, ready, setToken, renew, logout };
}
