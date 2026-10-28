import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { ReportView } from '@elo/core';
import type { Env } from '../config/env';
import { daysBetween, fillDays, fillHours } from './report-shape';

const MAX_DAYS = 366;

/**
 * Relatórios agregados no servidor. SQL cru não passa pelo `TenantRepo`, então
 * TODA consulta aqui amarra `restaurant_id = $1` explicitamente.
 * Receita = soma dos itens dos pedidos válidos (sem cancelados/devolvidos e sem
 * taxa de serviço).
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async build(rid: string, from?: string, to?: string): Promise<ReportView> {
    const tz = this.config.get('REPORT_TZ', { infer: true });
    const [today] = await this.db.query(`SELECT (now() AT TIME ZONE $1)::date::text AS d`, [tz]);
    const end = to ?? today.d;
    const start =
      from ?? new Date(Date.parse(`${end}T00:00:00Z`) - 29 * 86_400_000).toISOString().slice(0, 10);
    if (start > end) throw new BadRequestException('invalid_period');
    if (daysBetween(start, end) > MAX_DAYS) throw new BadRequestException('period_too_long');

    // $1 restaurante, $2 início (dia), $3 fim (dia, inclusivo), $4 fuso.
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
        params,
      ),
      this.db.query(
        `SELECT ((o.created_at AT TIME ZONE $4)::date)::text AS date, COUNT(*)::int AS orders, SUM(t.revenue)::bigint AS revenue
         FROM orders o ${SUMS} WHERE ${WINDOW} AND ${VALID} GROUP BY 1 ORDER BY 1`,
        params,
      ),
      this.db.query(
        `SELECT EXTRACT(HOUR FROM o.created_at AT TIME ZONE $4)::int AS hour, COUNT(*)::int AS orders
         FROM orders o WHERE ${WINDOW} AND ${VALID} GROUP BY 1`,
        params,
      ),
      this.db.query(
        `SELECT i->>'name' AS name, SUM((i->>'quantity')::bigint)::bigint AS qty,
                SUM((i->>'unitCents')::bigint * (i->>'quantity')::bigint)::bigint AS revenue
         FROM orders o CROSS JOIN LATERAL jsonb_array_elements(o.items) i
         WHERE ${WINDOW} AND ${VALID}
         GROUP BY i->>'productId', i->>'name' ORDER BY qty DESC, revenue DESC LIMIT 10`,
        params,
      ),
    ]);

    let orders = 0;
    let revenueCents = 0;
    let items = 0;
    let cancelled = 0;
    let returned = 0;
    for (const r of statusRows as { status: string; orders: number; revenue: string; qty: string }[]) {
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
        returned,
      },
      byDay: fillDays(
        start,
        end,
        (dayRows as { date: string; orders: number; revenue: string }[]).map((r) => ({
          date: r.date,
          orders: r.orders,
          revenueCents: Number(r.revenue),
        })),
      ),
      byHour: fillHours(hourRows as { hour: number; orders: number }[]),
      topProducts: (topRows as { name: string; qty: string; revenue: string }[]).map((r) => ({
        name: r.name,
        quantity: Number(r.qty),
        revenueCents: Number(r.revenue),
      })),
    };
  }
}
