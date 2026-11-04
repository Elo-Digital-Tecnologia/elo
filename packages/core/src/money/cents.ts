/** Cents in one real. */
export const CENTS_PER_REAL = 100;
/** Basis points in one percent (a service fee of 1000 bps is 10%). */
export const BPS_PER_PERCENT = 100;

/** Money is always in cents (integer). */
export function formatBRL(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function splitEqually(totalCents: number, people: number): number[] {
    if (!Number.isInteger(people) || people < 1)
        throw new RangeError('people must be >= 1');
    const base = Math.floor(totalCents / people);
    const rest = totalCents - base * people;
    return Array.from({ length: people }, (_, i) => base + (i < rest ? 1 : 0));
}

/** "12,50" or "12.50" → 1250. Returns null when invalid. */
export function parseCents(input: string): number | null {
    const m = /^\s*(\d+)(?:[.,](\d{1,2}))?\s*$/.exec(input);
    if (!m) return null;
    return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0);
}
