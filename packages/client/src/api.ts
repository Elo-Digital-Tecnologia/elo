/** One field's problem, as `@elo/core` describes it (`FieldError`): a code and its limits. */
export interface ApiFieldError {
  code: string;
  params?: { min?: number; max?: number; money?: boolean };
}

export class ApiError extends Error {
  /** Per-field problems of a `validation_failed` answer, keyed by path (`items.0.notes`). */
  readonly fields: Record<string, ApiFieldError>;
  /** The field a conflict is about (`username_taken` → `username`), when the API says. */
  readonly field: string | null;

  constructor(
    readonly status: number,
    readonly code: string,
    /** Whole error body, for responses that carry details (who handled it, which tables). */
    readonly data: Record<string, unknown> = {},
  ) {
    super(code);
    this.fields = data.fields && typeof data.fields === 'object' ? (data.fields as Record<string, ApiFieldError>) : {};
    this.field = typeof data.field === 'string' ? data.field : null;
  }
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

/**
 * Chamada JSON à API. Caminhos começam com `/api/` e são reescritos pelo Next
 * para o servidor, mantendo cookies de mesa no mesmo domínio.
 */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    credentials: 'include',
    headers: {
      ...(opts.body ? { 'content-type': 'application/json' } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new ApiError(res.status, msg ?? res.statusText, data);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Envio de arquivo (multipart). O navegador define o cabeçalho com o limite do corpo. */
export async function apiUpload<T>(path: string, file: File, token: string, fields: Record<string, string> = {}): Promise<T> {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  body.append('file', file);
  const res = await fetch(path, { method: 'POST', credentials: 'include', headers: { authorization: `Bearer ${token}` }, body });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (Array.isArray(data.message) ? data.message[0] : data.message) ?? res.statusText, data);
  }
  return (await res.json()) as T;
}

/** Downloads a private file with the staff token, for showing it on screen or in a new tab. */
export async function apiBlob(path: string, token: string): Promise<Blob> {
  const res = await fetch(path, { credentials: 'include', headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.blob();
}
