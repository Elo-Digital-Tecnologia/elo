import type { ReportView } from '@elo/core/api/views/report.view';
import { HOURS_PER_DAY, MS_PER_DAY } from '@elo/core/time/time-units';
import { ISO_DAY_LENGTH } from '#/common/constants.js';

/** YYYY-MM-DD → next day, independent from the machine's time zone. */
const nextDay = (d: string) =>
    new Date(Date.parse(`${d}T00:00:00Z`) + MS_PER_DAY)
        .toISOString()
        .slice(0, ISO_DAY_LENGTH);

/** Days without sales show up too (zero), so the chart does not skip dates. */
export function fillDays(
    from: string,
    to: string,
    rows: ReportView['byDay']
): ReportView['byDay'] {
    const byDate = new Map(rows.map((r) => [r.date, r]));
    const out: ReportView['byDay'] = [];
    for (let d = from; d <= to; d = nextDay(d)) {
        out.push(byDate.get(d) ?? { date: d, revenueCents: 0, orders: 0 });
    }
    return out;
}

export function fillHours(rows: ReportView['byHour']): ReportView['byHour'] {
    const byHour = new Map(rows.map((r) => [r.hour, r.orders]));
    return Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({
        hour,
        orders: byHour.get(hour) ?? 0
    }));
}

/** Days between the dates, both ends included. */
export function daysBetween(from: string, to: string): number {
    return (
        Math.round(
            (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY
        ) + 1
    );
}
