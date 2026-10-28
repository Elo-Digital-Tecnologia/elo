import type { ReportView } from '@elo/core';

const DAY_MS = 86_400_000;

/** YYYY-MM-DD → dia seguinte, sem depender do fuso da máquina. */
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

/** Dias do período sem venda também aparecem (zero), para o gráfico não "pular" datas. */
export function fillDays(from: string, to: string, rows: ReportView['byDay']): ReportView['byDay'] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const out: ReportView['byDay'] = [];
  for (let d = from; d <= to; d = nextDay(d)) {
    out.push(byDate.get(d) ?? { date: d, revenueCents: 0, orders: 0 });
  }
  return out;
}

export function fillHours(rows: ReportView['byHour']): ReportView['byHour'] {
  const byHour = new Map(rows.map((r) => [r.hour, r.orders]));
  return Array.from({ length: 24 }, (_, hour) => ({ hour, orders: byHour.get(hour) ?? 0 }));
}

/** Dias entre as datas, extremos incluídos. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}
