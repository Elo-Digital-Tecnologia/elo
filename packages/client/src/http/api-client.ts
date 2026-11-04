import type { ApiResponse } from '@elo/core/api/api-response';
import { ApiError } from './api-error';
import { HTTP_STATUS } from './http-status';

const errorOf = async (res: Response): Promise<ApiError> => {
    const body = (await res.json().catch(() => null)) as ApiResponse | null;
    return new ApiError(res.status, body?.error ?? null);
};

const dataOf = async <T>(res: Response): Promise<T> => {
    const text = await res.text();
    if (!text) return undefined as T;
    return (JSON.parse(text) as ApiResponse<T>).data as T;
};

/**
 * Fired on `window` when the API refuses a staff token (401), with that token as
 * `detail.token`: the area's `useAuth` renews it from the session, or signs out.
 */
export const UNAUTHORIZED_EVENT = 'elo:unauthorized';

function reportUnauthorized(status: number, token: string | null | undefined) {
    if (status === HTTP_STATUS.UNAUTHORIZED && token && typeof window !== 'undefined')
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { token } }));
}

export interface ApiOptions {
    method?: string;
    body?: unknown;
    token?: string | null;
}

/**
 * JSON call to the API, answering the envelope's `data`. Paths start with `/api/` and
 * are rewritten by Next to the server, so table cookies stay on the same domain.
 */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
    const res = await fetch(path, {
        method: opts.method ?? (opts.body ? 'POST' : 'GET'),
        credentials: 'include',
        cache: 'no-store',
        headers: {
            ...(opts.body ? { 'content-type': 'application/json' } : {}),
            ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {})
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) {
        reportUnauthorized(res.status, opts.token);
        throw await errorOf(res);
    }
    return dataOf<T>(res);
}

/** File upload (multipart). The browser sets the header with the body boundary. */
export async function apiUpload<T>(
    path: string,
    file: File,
    token: string,
    fields: Record<string, string> = {}
): Promise<T> {
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    body.append('file', file);
    const res = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { authorization: `Bearer ${token}` },
        body
    });
    if (!res.ok) {
        reportUnauthorized(res.status, token);
        throw await errorOf(res);
    }
    return dataOf<T>(res);
}

/** Downloads a private file with the staff token, for showing it on screen or in a new tab. */
export async function apiBlob(path: string, token: string): Promise<Blob> {
    const res = await fetch(path, {
        credentials: 'include',
        headers: { authorization: `Bearer ${token}` }
    });
    reportUnauthorized(res.status, token);
    if (!res.ok) throw await errorOf(res);
    return res.blob();
}
