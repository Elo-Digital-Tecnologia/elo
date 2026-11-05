'use client';

import type { TableState } from '@elo/core/tables/table-state';
import {
    Check,
    ChevronDown,
    Hourglass,
    Receipt,
    ShoppingBag,
    Store,
    UtensilsCrossed,
    WifiOff
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GUEST_STICKY_TOP_VAR } from '#/_lib/constants/layout';
import { GUEST_TABLE_STATUS, GUEST_STATUS_TEXTS as T } from '#/_lib/messages/tables';

type Status = keyof typeof GUEST_TABLE_STATUS;

const LOOK: Record<Status, { icon: typeof Hourglass; chip: string; edge: string }> = {
    closed: { icon: ShoppingBag, chip: 'bg-brand text-brand-fg', edge: 'border-brand' },
    restaurant_closed: { icon: Store, chip: 'bg-muted/25 text-fg', edge: 'border-line' },
    pending_open: {
        icon: Hourglass,
        chip: 'bg-warning text-white',
        edge: 'border-warning'
    },
    open: {
        icon: UtensilsCrossed,
        chip: 'bg-success text-white',
        edge: 'border-success'
    },
    pending_close: { icon: Receipt, chip: 'bg-info text-white', edge: 'border-info' }
};

/** Which of the four steps the table is on. */
const STEP: Record<TableState, number> = {
    closed: 0,
    pending_open: 1,
    open: 2,
    pending_close: 3
};

/**
 * Where the guest's table stands and what to do next, fixed at the top while the menu
 * scrolls. Tapping it shows the steps of a visit; a lost connection shows here too.
 */
export function TableStatusBar({
    state,
    restaurantClosed,
    waiterName,
    link
}: {
    state: TableState;
    /** A table not opened yet waits for the restaurant to open. */
    restaurantClosed: boolean;
    waiterName: string | null;
    /** Live feed problem, when it lasts long enough to mention. */
    link: 'offline' | 'reconnecting' | null;
}) {
    const [expanded, setExpanded] = useState(false);
    const bar = useRef<HTMLDivElement>(null);

    // Publishes the bar's height, so the category tabs stick right below it.
    useEffect(() => {
        const el = bar.current;
        if (!el) return;
        const root = document.documentElement.style;
        const observer = new ResizeObserver(() =>
            root.setProperty(GUEST_STICKY_TOP_VAR, `${el.offsetHeight}px`)
        );
        observer.observe(el);
        return () => {
            observer.disconnect();
            root.removeProperty(GUEST_STICKY_TOP_VAR);
        };
    }, []);
    const status: Status = restaurantClosed ? 'restaurant_closed' : state;
    const look = LOOK[status];
    const text = GUEST_TABLE_STATUS[status];
    const step = STEP[state];
    const served = waiterName && (state === 'open' || state === 'pending_close');

    return (
        <div
            ref={bar}
            role="status"
            aria-live="polite"
            className={`sticky top-0 z-30 border-b-2 bg-bg/90 backdrop-blur-md ${look.edge}`}
        >
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-label={expanded ? T.hideSteps : T.showSteps}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
                <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-pill ${look.chip}`}
                >
                    <look.icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block font-display text-base font-bold leading-tight">
                        {text.title}
                    </span>
                    <span className="block text-sm leading-snug text-muted">
                        {text.text}
                    </span>
                    {served && (
                        <span className="mt-0.5 block text-xs font-semibold text-fg">
                            {T.waiter(waiterName)}
                        </span>
                    )}
                </span>
                <ChevronDown
                    size={18}
                    className={`shrink-0 text-muted transition ${expanded ? 'rotate-180' : ''}`}
                    aria-hidden
                />
            </button>
            {expanded && (
                <ol className="flex gap-1.5 px-4 pb-3 text-xs">
                    {T.steps.map((label, i) => (
                        <li
                            key={label}
                            aria-current={i === step ? 'step' : undefined}
                            className={`flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-2 text-center ${i === step ? 'bg-brand/15 font-bold text-fg' : i < step ? 'text-fg' : 'text-muted'}`}
                        >
                            <span
                                className={`grid h-6 w-6 place-items-center rounded-pill text-[11px] font-bold ${i < step ? 'bg-success text-white' : i === step ? 'bg-brand text-brand-fg' : 'border border-line'}`}
                            >
                                {i < step ? <Check size={13} /> : i + 1}
                            </span>
                            {label}
                        </li>
                    ))}
                </ol>
            )}
            {link && (
                <p className="flex items-center gap-2 bg-warning/15 px-4 py-2 text-sm font-medium text-warning">
                    <WifiOff size={16} className="shrink-0" aria-hidden />
                    {link === 'offline' ? T.offline : T.reconnecting}
                </p>
            )}
        </div>
    );
}
