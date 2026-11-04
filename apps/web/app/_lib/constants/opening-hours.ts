import { MINUTES_PER_DAY, MINUTES_PER_HOUR } from '@elo/core/time/time-units';

/** How a new shift is suggested after the last one of the day, in minutes from midnight. */
export const NEXT_SHIFT = {
    /** Used when the last shift has no valid end yet (15:00). */
    fallbackLastEnd: 15 * MINUTES_PER_HOUR,
    gapAfterLast: 3 * MINUTES_PER_HOUR,
    latestStart: 20 * MINUTES_PER_HOUR,
    length: 4 * MINUTES_PER_HOUR,
    latestEnd: MINUTES_PER_DAY - 1
} as const;
