import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { serviceOrigin } from './origin';

export type RealtimeHandlers = Record<string, (payload: never) => void>;

/**
 * Conecta ao WebSocket da API. Funcionário passa `token` (JWT); cliente de mesa
 * deixa vazio e usa o cookie de sessão.
 */
export function useRealtime(handlers: RealtimeHandlers, token?: string | null, enabled = true) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const url = serviceOrigin(3001, process.env.NEXT_PUBLIC_API_URL);
    const socket: Socket = io(url, {
      withCredentials: true,
      auth: token ? { token } : {},
    });
    for (const ev of Object.keys(ref.current)) socket.on(ev, (p) => ref.current[ev]?.(p as never));
    return () => {
      socket.disconnect();
    };
  }, [token, enabled]);
}
