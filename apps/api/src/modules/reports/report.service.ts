import type {
    ReportView,
    StaffPerformanceRow,
    StaffReportView
} from '@elo/core/api/views/report.view';
import type { EnvConfig } from '#/config/env.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { REPORT_MAX_DAYS } from '@elo/core/reports/report-limits';
import { MS_PER_DAY } from '@elo/core/time/time-units';
import { DataSource } from 'typeorm';
import { ISO_DAY_LENGTH } from '#/common/constants.js';
import { InvalidPeriodException } from './exceptions/invalid-period.exception.js';
import { PeriodTooLongException } from './exceptions/period-too-long.exception.js';
import { REPORT_DEFAULT_DAYS, REPORT_TOP_PRODUCTS } from './report.constants.js';
import { daysBetween, fillDays, fillHours } from './utils/report-shape.js';

/**
 * Reports aggregated on the server. Raw SQL does not go through `TenantRepository`, so
 * EVERY query here binds `restaurant_id = $1` explicitly.
 * Revenue = sum of the items of valid orders (no cancelled or returned orders, and no
 * service fee).
 */
@Injectable()
export class ReportService {
    constructor(
        @InjectDataSource() private readonly db: DataSource,
        private readonly configService: ConfigService<EnvConfig, true>
    ) {}

    /** Calendar days in the restaurant time zone; the last 30 days by default. */
    private async period(from?: string, to?: string) {
        const tz = this.configService.getOrThrow('app.timeZone', { infer: true });
        const [today] = await this.db.query(
            `SELECT (now() AT TIME ZONE $1)::date::text AS d`,
            [tz]
        );
        const end = to ?? today.d;
        const start =
            from ??
            new Date(
                Date.parse(`${end}T00:00:00Z`) - (REPORT_DEFAULT_DAYS - 1) * MS_PER_DAY
            )
                .toISOString()
                .slice(0, ISO_DAY_LENGTH);
        if (start > end) throw new InvalidPeriodException();
        if (daysBetween(start, end) > REPORT_MAX_DAYS) throw new PeriodTooLongException();
        return { start, end, tz };
    }

    /**
     * Floor service numbers per waiter: calls answered, tables opened and closed,
     * and how long guests waited. Only waiters do this work, so only they are
     * measured; archived waiters show up only when they have activity in the period.
     */
    public async staff(
        rid: string,
        from?: string,
        to?: string
    ): Promise<StaffReportView> {
        const { start, end, tz } = await this.period(from, to);
        const within = (col: string) =>
            `${col} >= ($2::date)::timestamp AT TIME ZONE $4 AND ${col} < (($3::date) + 1)::timestamp AT TIME ZONE $4`;
        const rows = await this.db.query(
            `WITH calls AS (
         SELECT resolved_by AS id, COUNT(*)::int AS n, AVG(EXTRACT(EPOCH FROM resolved_at - created_at))::float AS secs
         FROM waiter_calls WHERE restaurant_id = $1 AND resolved_by IS NOT NULL AND ${within('resolved_at')} GROUP BY 1
       ), opened AS (
         SELECT opened_by AS id, COUNT(*)::int AS n,
                AVG(EXTRACT(EPOCH FROM opened_at - open_requested_at)) FILTER (WHERE open_requested_at IS NOT NULL)::float AS secs
         FROM table_sessions WHERE restaurant_id = $1 AND opened_by IS NOT NULL AND ${within('opened_at')} GROUP BY 1
       ), closed AS (
         SELECT closed_by AS id, COUNT(*)::int AS n
         FROM table_sessions WHERE restaurant_id = $1 AND closed_by IS NOT NULL AND closed_reason = 'closed' AND ${within('closed_at')} GROUP BY 1
       )
       SELECT u.id, u.name, u.roles, u.deleted_at IS NOT NULL AS archived,
              COALESCE(c.n, 0) AS "callsAnswered", c.secs AS "avgCallSeconds",
              COALESCE(o.n, 0) AS "tablesOpened", o.secs AS "avgOpenSeconds",
              COALESCE(cl.n, 0) AS "tablesClosed"
       FROM staff_users u
       LEFT JOIN calls c ON c.id = u.id
       LEFT JOIN opened o ON o.id = u.id
       LEFT JOIN closed cl ON cl.id = u.id
       WHERE u.restaurant_id = $1 AND 'waiter' = ANY(u.roles)
         AND (u.deleted_at IS NULL OR c.n IS NOT NULL OR o.n IS NOT NULL OR cl.n IS NOT NULL)
       ORDER BY COALESCE(c.n, 0) + COALESCE(o.n, 0) + COALESCE(cl.n, 0) DESC, u.name ASC`,
            [rid, start, end, tz]
        );
        const round = (n: number | null) => (n === null ? null : Math.round(n));
        return {
            from: start,
            to: end,
            rows: (rows as StaffPerformanceRow[]).map((r) => ({
                ...r,
                avgCallSeconds: round(r.avgCallSeconds),
                avgOpenSeconds: round(r.avgOpenSeconds)
            }))
        };
    }

    public async build(rid: string, from?: string, to?: string): Promise<ReportView> {
        const { start, end, tz } = await this.period(from, to);

        // $1 restaurant, $2 start (day), $3 end (day, inclusive), $4 time zone.
        const params = [rid, start, end, tz];
        const WINDOW = `o.restaurant_id = $1
      AND o.created_at >= ($2::date)::timestamp AT TIME ZONE $4
      AND o.created_at < (($3::date) + 1)::timestamp AT TIME ZONE $4`;
        const VALID = `o.status NOT IN ('cancelled', 'returned')`;
        const SUMS = `CROSS JOIN LATERAL (
        SELECT COALESCE(SUM((i->>'unitCents')::bigint * (i->>'quantity')::bigint), 0) AS revenue,
               COALESCE(SUM((i->>'quantity')::bigint), 0) AS qty
        FROM jsonb_array_elements(o.items) i
      ) t`;

        const [statusRows, dayRows, hourRows, topRows] = await Promise.all([
            this.db.query(
                `SELECT o.status, COUNT(*)::int AS orders, SUM(t.revenue)::bigint AS revenue, SUM(t.qty)::bigint AS qty
         FROM orders o ${SUMS} WHERE ${WINDOW} GROUP BY o.status`,
                params
            ),
            this.db.query(
                `SELECT ((o.created_at AT TIME ZONE $4)::date)::text AS date, COUNT(*)::int AS orders, SUM(t.revenue)::bigint AS revenue
         FROM orders o ${SUMS} WHERE ${WINDOW} AND ${VALID} GROUP BY 1 ORDER BY 1`,
                params
            ),
            this.db.query(
                `SELECT EXTRACT(HOUR FROM o.created_at AT TIME ZONE $4)::int AS hour, COUNT(*)::int AS orders
         FROM orders o WHERE ${WINDOW} AND ${VALID} GROUP BY 1`,
                params
            ),
            this.db.query(
                `SELECT i->>'name' AS name, SUM((i->>'quantity')::bigint)::bigint AS qty,
                SUM((i->>'unitCents')::bigint * (i->>'quantity')::bigint)::bigint AS revenue
         FROM orders o CROSS JOIN LATERAL jsonb_array_elements(o.items) i
         WHERE ${WINDOW} AND ${VALID}
         GROUP BY i->>'productId', i->>'name' ORDER BY qty DESC, revenue DESC LIMIT ${REPORT_TOP_PRODUCTS}`,
                params
            )
        ]);

        let orders = 0;
        let revenueCents = 0;
        let items = 0;
        let cancelled = 0;
        let returned = 0;
        for (const r of statusRows as {
            status: string;
            orders: number;
            revenue: string;
            qty: string;
        }[]) {
            if (r.status === 'cancelled') cancelled += r.orders;
            else if (r.status === 'returned') returned += r.orders;
            else {
                orders += r.orders;
                revenueCents += Number(r.revenue);
                items += Number(r.qty);
            }
        }

        return {
            from: start,
            to: end,
            totals: {
                revenueCents,
                orders,
                items,
                averageTicketCents: orders ? Math.round(revenueCents / orders) : 0,
                cancelled,
                returned
            },
            byDay: fillDays(
                start,
                end,
                (dayRows as { date: string; orders: number; revenue: string }[]).map(
                    (r) => ({
                        date: r.date,
                        orders: r.orders,
                        revenueCents: Number(r.revenue)
                    })
                )
            ),
            byHour: fillHours(hourRows as { hour: number; orders: number }[]),
            topProducts: (
                topRows as { name: string; qty: string; revenue: string }[]
            ).map((r) => ({
                name: r.name,
                quantity: Number(r.qty),
                revenueCents: Number(r.revenue)
            }))
        };
    }
}
