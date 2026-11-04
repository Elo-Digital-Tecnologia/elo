import type { Availability, PauseKind } from '../../opening-hours/open-status.js';

export interface PauseView {
    id: string;
    kind: PauseKind;
    startsAt: string;
    endsAt: string | null;
    endedAt: string | null;
    reason: string | null;
    createdByName: string | null;
    createdAt: string;
}

export interface PauseList {
    availability: Availability;
    /** Current and scheduled closures, soonest first. */
    upcoming: PauseView[];
    /** Closures that already happened, newest first, one page at a time. */
    past: { items: PauseView[]; total: number; page: number; pageSize: number };
}
