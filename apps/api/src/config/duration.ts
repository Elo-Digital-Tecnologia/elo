const UNIT_MS = {
    ms: 1,
    s: 1_000,
    sec: 1_000,
    m: 60_000,
    min: 60_000,
    h: 3_600_000,
    d: 86_400_000
} as const;

type DurationUnit = keyof typeof UNIT_MS;

const DURATION_PATTERN = new RegExp(`^(\\d+)\\s*(${Object.keys(UNIT_MS).join('|')})$`);

/** Milliseconds of a duration written as `<amount><unit>`: `500ms`, `60s`, `15min`, `4h`, `7d`. */
export function parseDuration(value: string): number | null {
    const match = DURATION_PATTERN.exec(value.trim());
    if (!match) return null;
    const [, amount, unit] = match;
    const ms = Number(amount) * UNIT_MS[unit as DurationUnit];
    return ms > 0 ? ms : null;
}
