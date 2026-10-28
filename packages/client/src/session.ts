import { useCallback, useEffect, useMemo, useState } from 'react';

const KEY = 'elo.token';
/** Cada área guarda o próprio token: o painel Elo e o de cada restaurante não se misturam. */
const keyOf = (scope: string) => `${KEY}.${scope}`;

export interface TokenPayload {
  sub: string;
  role: string;
  restaurantId: string | null;
  permissions: string[];
  /** Presente quando a equipe Elo entrou no painel do restaurante. */
  impersonatedBy?: string;
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

/** Guarda um token já emitido para a área (usado ao abrir o painel de um restaurante a partir do admin). */
export function storeToken(scope: string, token: string) {
  try {
    sessionStorage.setItem(keyOf(scope), token);
  } catch {
    /* storage indisponível */
  }
}

/** Token de funcionário em sessionStorage (por área); limpo ao fechar a aba. */
export function useAuth(scope: string) {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(keyOf(scope));
      if (saved && decodeToken(saved)) setTokenState(saved);
    } catch {
      /* storage indisponível */
    }
    setReady(true);
  }, [scope]);

  const setToken = useCallback((next: string | null) => {
    setTokenState(next);
    try {
      if (next) sessionStorage.setItem(keyOf(scope), next);
      else sessionStorage.removeItem(keyOf(scope));
    } catch {
      /* storage indisponível */
    }
  }, [scope]);

  // Referência estável: efeitos que dependem de `user` não podem rodar a cada render.
  const user = useMemo(() => (token ? decodeToken(token) : null), [token]);

  return { token, user, ready, setToken };
}
