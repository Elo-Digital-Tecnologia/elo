'use client';

import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

const tappedKey = (slug: string) => `elo.google.${slug}`;

const read = (store: () => Storage, key: string) => {
    try {
        return store().getItem(key) === '1';
    } catch {
        return false;
    }
};

const write = (store: () => Storage, key: string) => {
    try {
        store().setItem(key, '1');
    } catch {
        /* storage unavailable: the invitation may come back */
    }
};

/** The Google "G" in the brand's own colors, the one place outside the theme tokens. */
function GoogleMark({ size = 26 }: { size?: number }) {
    return (
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
            <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
        </svg>
    );
}

/**
 * Invitation to review the restaurant on Google. Tapping it hides it on this device for
 * good; nothing about it leaves the device. It is shown after any rating: inviting only
 * the satisfied guests is against Google's rules.
 */
export function GoogleReviewCard({
    url,
    slug,
    name,
    thanks = false
}: {
    url: string | null;
    slug: string;
    name: string;
    thanks?: boolean;
}) {
    const [hidden, setHidden] = useState(true);
    useEffect(() => setHidden(read(() => localStorage, tappedKey(slug))), [slug]);
    if (!url || hidden) return null;

    return (
        <section
            aria-label="Avaliação no Google"
            className="surface space-y-3 border-2 border-accent/60 p-4"
        >
            <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-white shadow-sm">
                    <GoogleMark />
                </span>
                <h2 className="min-w-0 font-semibold leading-tight">
                    {thanks
                        ? 'Obrigado! Conte também no Google'
                        : `Avalie o ${name} no Google`}
                </h2>
            </div>
            <p className="text-sm text-muted">
                Sua avaliação no Google Maps ajuda outras pessoas a nos encontrar. Leva
                menos de um minuto.
            </p>
            <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => {
                    write(() => localStorage, tappedKey(slug));
                    setHidden(true);
                }}
                className="btn-glass inline-flex w-full items-center justify-center gap-2 rounded-pill px-5 py-3 text-sm font-semibold"
            >
                Avaliar no Google <ExternalLink size={15} aria-hidden />
            </a>
        </section>
    );
}

/** Compact invitation for the bill tab, under the service review; hidden on this device once tapped. */
export function GoogleReviewRow({
    url,
    slug,
    thanks = false
}: {
    url: string | null;
    slug: string;
    thanks?: boolean;
}) {
    const [hidden, setHidden] = useState(true);
    useEffect(() => setHidden(read(() => localStorage, tappedKey(slug))), [slug]);
    if (!url || hidden) return null;

    return (
        <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-white shadow-sm">
                <GoogleMark size={20} />
            </span>
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                {thanks ? 'Obrigado! Conte também no Google' : 'Avalie também no Google'}
            </p>
            <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => {
                    write(() => localStorage, tappedKey(slug));
                    setHidden(true);
                }}
                className="btn-glass inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-sm font-semibold"
            >
                Avaliar <ExternalLink size={14} aria-hidden />
            </a>
        </div>
    );
}

/** Link to the restaurant's Google reviews among the menu's info chips; it is the restaurant's info, so it stays. */
export function GoogleReviewChip({
    url,
    className
}: {
    url: string | null;
    className: string;
}) {
    if (!url) return null;
    return (
        <a className={className} href={url} target="_blank" rel="noreferrer noopener">
            <GoogleMark size={15} /> Avaliar no Google
        </a>
    );
}
