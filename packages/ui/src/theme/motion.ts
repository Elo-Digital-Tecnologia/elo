/** Motion tokens: every animation of the app takes its timing from here. */
export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

/** Durations in seconds. */
export const MOTION_DURATIONS = {
    instant: 0.12,
    quick: 0.25,
    page: 0.35,
    enter: 0.4,
    reveal: 0.5,
    slow: 0.7,
    slower: 0.8,
    chart: 0.9,
    chartFull: 1,
    count: 1.1,
    chartArea: 1.2,
    floatShort: 6,
    floatMedium: 7,
    floatLong: 9
} as const;

/** Delays in seconds, for staggered entrances. */
export const MOTION_DELAYS = { short: 0.15, medium: 0.4, long: 1 } as const;

export const MOTION_SPRINGS = {
    press: { type: 'spring', stiffness: 500, damping: 28 },
    list: { type: 'spring', stiffness: 500, damping: 40 },
    navigation: { type: 'spring', stiffness: 420, damping: 34 },
    overlay: { type: 'spring', stiffness: 380, damping: 32 },
    sheet: { type: 'spring', stiffness: 380, damping: 38 },
    panel: { type: 'spring', stiffness: 360, damping: 30 },
    card: { type: 'spring', stiffness: 320, damping: 30 },
    bar: { type: 'spring', stiffness: 320, damping: 32 }
} as const;
