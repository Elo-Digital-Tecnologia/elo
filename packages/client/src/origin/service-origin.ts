import { useEffect, useState } from 'react';

const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);

/**
 * Origin of another service (API, menu) as the browser sees it. Uses the page's host,
 * so it works through localhost or the network IP. An explicit URL that does not
 * point to localhost (production) wins.
 */
export function serviceOrigin(port: number, explicit?: string): string {
    if (explicit && !isLocal(explicit)) return explicit.replace(/\/$/, '');
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

/** Render-safe version: starts on localhost (SSR) and adjusts after mounting. */
export function useServiceOrigin(port: number, explicit?: string): string {
    const [origin, setOrigin] = useState(`http://localhost:${port}`);
    useEffect(() => setOrigin(serviceOrigin(port, explicit)), [port, explicit]);
    return origin;
}
