'use client';

import { useId } from 'react';

/**
 * The two links, drawn flat and turned 45°. Where one passes over the other, its stretch
 * (`*Over`) is cut out of the other with a small gap, so they interlock.
 */
const LINKS = {
    deep: 'M317 396.5H453A115 115 0 0 1 453 626.5H317A115 115 0 0 1 317 396.5Z',
    bright: 'M570 396.5H706A115 115 0 0 1 706 626.5H570A115 115 0 0 1 570 396.5Z',
    deepOver: 'M395 396.5H453A115 115 0 0 1 568 511.5',
    brightOver: 'M455 511.5A115 115 0 0 0 570 626.5H628'
} as const;
const LINK_WIDTH = 92;
const GAP_WIDTH = LINK_WIDTH + 40;

/** Elo mark: two interlinked chain links. */
export function LogoMark({ size = 32 }: { size?: number }) {
    // useId has ':' in it; a plain id keeps the mask references safe in every browser.
    const id = `elo${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const cut = (over: string, name: string) => (
        <mask
            id={`${id}${name}`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1024"
            height="1024"
        >
            <rect width="1024" height="1024" fill="#fff" />
            <path d={over} stroke="#000" strokeWidth={GAP_WIDTH} fill="none" />
        </mask>
    );
    return (
        <svg width={size} height={size} viewBox="200 200 624 624" fill="none" aria-hidden>
            <defs>
                {cut(LINKS.brightOver, 'deep')}
                {cut(LINKS.deepOver, 'bright')}
            </defs>
            <g transform="rotate(-45 512 512)" strokeWidth={LINK_WIDTH}>
                <path
                    d={LINKS.deep}
                    mask={`url(#${id}deep)`}
                    stroke="hsl(var(--elo-logo-deep))"
                />
                <path
                    d={LINKS.bright}
                    mask={`url(#${id}bright)`}
                    stroke="hsl(var(--elo-logo-bright))"
                />
            </g>
        </svg>
    );
}

export function Logo({ sub }: { sub?: string }) {
    return (
        <span className="flex items-center gap-2.5">
            <LogoMark />
            <span className="min-w-0 leading-tight">
                <span className="block whitespace-nowrap font-display text-lg font-bold tracking-tight">
                    Elo <span className="text-brand">Cardápio</span>
                </span>
                {sub && (
                    <span className="block max-w-[11rem] truncate text-xs font-medium text-muted">
                        {sub}
                    </span>
                )}
            </span>
        </span>
    );
}
