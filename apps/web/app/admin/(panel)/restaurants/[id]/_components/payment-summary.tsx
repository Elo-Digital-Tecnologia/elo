import { type BillingEntryView, formatBRL, type MonthState, paymentSummary } from '@elo/core';

const MONTH: Record<MonthState, { label: string; className: string }> = {
  paid_on_time: { label: 'Pago em dia', className: 'bg-success' },
  paid_late: { label: 'Pago com atraso', className: 'bg-warning' },
  trial: { label: 'Em teste', className: 'bg-brand/40' },
  uncovered: { label: 'Sem pagamento', className: 'bg-danger' },
  future: { label: 'Ainda não chegou', className: 'bg-line/40' },
  before: { label: 'Antes do cadastro', className: 'bg-line/20' },
};

const monthName = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

/**
 * Billing at a glance: totals, punctuality and a strip of the last 12 months. It
 * says something from the first payment on, unlike a chart of near-identical fees.
 */
export function PaymentSummaryCard({ entries, restaurant }: { entries: BillingEntryView[]; restaurant: { createdAt: string; initialDueDate: string } }) {
  const s = paymentSummary(entries, restaurant);
  const stats: [string, string, string?][] = [
    ['Total recebido', formatBRL(s.totalCents)],
    ['Pagamentos', String(s.payments), s.lastPaidAt ? `último em ${new Date(s.lastPaidAt).toLocaleDateString('pt-BR')}` : undefined],
    ['Em dia', s.onTimePct === null ? '—' : `${s.onTimePct}%`, 'pagos até o vencimento'],
    ['Atraso médio', s.avgDelayDays === null ? '—' : `${s.avgDelayDays.toLocaleString('pt-BR')} ${s.avgDelayDays === 1 ? 'dia' : 'dias'}`],
  ];
  const shown = (Object.keys(MONTH) as MonthState[]).filter((k) => k !== 'before' && s.months.some((m) => m.state === k));
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <div key={label} className="surface px-4 py-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 font-display text-xl font-bold tabular-nums">{value}</dd>
            {hint && <dd className="text-xs text-muted">{hint}</dd>}
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-2 text-sm font-medium">Últimos 12 meses</p>
        <ol className="grid grid-cols-12 gap-1" aria-label="Situação de cada mês">
          {s.months.map((m) => (
            <li key={m.month} className="flex flex-col items-center gap-1" title={`${monthName(m.month)}: ${MONTH[m.state].label}`}>
              <span className={`h-7 w-full rounded-md ${MONTH[m.state].className}`} aria-hidden />
              <span className="text-[10px] leading-none text-muted sm:text-xs">{monthName(m.month).split(' ')[0].replace('.', '')}</span>
              <span className="sr-only">{`${monthName(m.month)}: ${MONTH[m.state].label}`}</span>
            </li>
          ))}
        </ol>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {shown.map((k) => (
            <li key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${MONTH[k].className}`} aria-hidden /> {MONTH[k].label}</li>
          ))}
        </ul>
        {s.payments === 0 && <p className="mt-2 text-sm text-muted">Nenhum pagamento ainda.</p>}
      </div>
    </div>
  );
}
