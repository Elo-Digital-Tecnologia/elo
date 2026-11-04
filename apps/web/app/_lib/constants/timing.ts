import { MS_PER_SECOND } from '@elo/core/time/time-units';

/** How long screens show short feedback ("copied", "called"), in milliseconds. */
export const FEEDBACK_MS = {
    copied: 1600,
    done: 2000,
    called: 3500,
    saved: 4000,
    waiterComing: 8000
} as const;

/** Waits before acting on a burst of input or events. */
export const DEBOUNCE_MS = {
    preview: 250,
    search: 350,
    reload: 1200
} as const;

/** How long a new order stays highlighted on the kitchen screen. */
export const KITCHEN_HIGHLIGHT_MS = 1600;

/** Step of the phone demo on the landing page. */
export const DEMO_STEP_MS = 1900;

/** Margin after a scheduled status change before the screen reloads, so the server has moved on. */
export const STATUS_CHANGE_MARGIN_MS = MS_PER_SECOND;

/** setTimeout cannot wait longer than this (2^31 - 1 ms). */
export const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** Retries of the panel's first load, waiting a bit longer each time. */
export const LOAD_RETRY = { attempts: 4, backoffMs: 1500 } as const;
