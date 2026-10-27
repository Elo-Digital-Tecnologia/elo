import { useCallback, useEffect, useState } from 'react';

const KEY = 'elo.token';

export interface TokenPayload {
  sub: string;
  role: string;
  restaurantId: string | null;
  permissions: string[];
  exp: number;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const json = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as TokenPayload;
    return payload.exp * 1000 > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

/** Token de funcionário em sessionStorage; limpo ao fechar a aba. */
export function useAuth() {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved && decodeToken(saved)) setTokenState(saved);
    } catch {
      /* storage indisponível */
    }
    setReady(true);
  }, []);

  const setToken = useCallback((next: string | null) => {
    setTokenState(next);
    try {
      if (next) sessionStorage.setItem(KEY, next);
      else sessionStorage.removeItem(KEY);
    } catch {
      /* storage indisponível */
    }
  }, []);

  return { token, user: token ? decodeToken(token) : null, ready, setToken };
}
