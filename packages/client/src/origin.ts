import { useEffect, useState } from 'react';

const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);

/**
 * Origem de outro serviço (API, cardápio) vista pelo navegador. Usa o mesmo host
 * da página, assim funciona por localhost ou pelo IP da rede. Uma URL explícita
 * que não aponte para localhost (produção) tem prioridade.
 */
export function serviceOrigin(port: number, explicit?: string): string {
  if (explicit && !isLocal(explicit)) return explicit.replace(/\/$/, '');
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

/** Versão para renderização: começa em localhost (SSR) e ajusta após montar. */
export function useServiceOrigin(port: number, explicit?: string): string {
  const [origin, setOrigin] = useState(`http://localhost:${port}`);
  useEffect(() => setOrigin(serviceOrigin(port, explicit)), [port, explicit]);
  return origin;
}
