export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
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
    throw new ApiError(res.status, msg ?? res.statusText);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
