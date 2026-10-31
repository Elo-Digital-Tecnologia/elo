'use client';

import { BarChart3, ClipboardList, Receipt, Undo2, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { formatBRL, type ReportView } from '@elo/core';
import { AreaChart, BarList, Button, ColumnChart, EmptyState, ErrorState, Field, GlassCard, PageHeader, SkeletonCards, Stagger, StaggerItem, Stat } from '@elo/ui';
import { Shell, useStaff } from '../../_components/shell';

/** Dia do calendário local no formato da API. */
const ymd = (d: Date) => d.toLocaleDateString('sv-SE');
const daysAgo = (n: number) => ymd(new Date(Date.now() - n * 86_400_000));
const short = (iso: string) => iso.slice(8) + '/' + iso.slice(5, 7);

function Reports() {
  const { token } = useStaff();
  const [range, setRange] = useState({ from: daysAgo(29), to: ymd(new Date()) });
  const [data, setData] = useState<ReportView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api<ReportView>(`/api/reports?from=${range.from}&to=${range.to}`, { token }));
    } catch (e) {
      setData(null);
      setError(e instanceof ApiError && e.code === 'period_too_long' ? 'O período máximo é de 366 dias.' : e instanceof ApiError && e.code === 'invalid_period' ? 'A data inicial deve ser anterior à final.' : 'Não foi possível carregar o relatório.');
    }
  }, [token, range]);

  useEffect(() => {
    void load();
  }, [load]);

  const preset = (days: number) => setRange({ from: daysAgo(days - 1), to: ymd(new Date()) });

  return (
    <>
      <PageHeader title="Relatórios" description="O faturamento soma os itens dos pedidos válidos, sem a taxa de serviço." />
      <GlassCard className="mb-5 flex flex-wrap items-end gap-3 p-4">
        <Field label="De"><input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} /></Field>
        <Field label="Até"><input type="date" value={range.to} min={range.from} max={ymd(new Date())} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} /></Field>
        <div className="flex gap-2">
          <Button variant="soft" onClick={() => preset(1)}>Hoje</Button>
          <Button variant="soft" onClick={() => preset(7)}>7 dias</Button>
          <Button variant="soft" onClick={() => preset(30)}>30 dias</Button>
        </div>
      </GlassCard>

      {error && <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>{error}</ErrorState>}
      {!data && !error && <SkeletonCards count={4} />}
      {data && data.totals.orders === 0 && data.totals.cancelled === 0 && data.totals.returned === 0 && (
        <EmptyState icon={BarChart3} title="Sem pedidos neste período">Escolha outras datas.</EmptyState>
      )}
      {data && (data.totals.orders > 0 || data.totals.cancelled > 0 || data.totals.returned > 0) && (
        <>
          <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StaggerItem><Stat label="Faturamento" value={data.totals.revenueCents / 100} format={(n) => formatBRL(Math.round(n * 100))} icon={Wallet} trend={data.byDay.map((d) => d.revenueCents)} hint={`${data.totals.items} itens vendidos`} /></StaggerItem>
            <StaggerItem><Stat label="Pedidos" value={data.totals.orders} icon={ClipboardList} trend={data.byDay.map((d) => d.orders)} /></StaggerItem>
            <StaggerItem><Stat label="Ticket médio" value={data.totals.averageTicketCents / 100} format={(n) => formatBRL(Math.round(n * 100))} icon={Receipt} hint="Por pedido enviado" /></StaggerItem>
            <StaggerItem><Stat label="Cancelados / devolvidos" value={data.totals.cancelled + data.totals.returned} icon={Undo2} hint={`${data.totals.cancelled} cancelados · ${data.totals.returned} devolvidos`} /></StaggerItem>
          </Stagger>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <GlassCard className="p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold">Faturamento por dia</h2>
              <p className="mb-3 text-sm text-muted">{short(data.from)} a {short(data.to)}</p>
              <AreaChart data={data.byDay.map((d) => ({ label: short(d.date), value: d.revenueCents }))} format={(n) => formatBRL(n)} name="Faturamento por dia" />
            </GlassCard>
            <GlassCard className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Mais vendidos</h2>
              {data.topProducts.length ? <BarList data={data.topProducts.map((p) => ({ label: p.name, value: p.quantity }))} format={(n) => `${n}x`} /> : <p className="text-sm text-muted">Sem vendas no período.</p>}
            </GlassCard>
          </div>

          <GlassCard className="mt-5 p-6">
            <h2 className="text-lg font-semibold">Pedidos por hora do dia</h2>
            <p className="mb-3 text-sm text-muted">Soma do período inteiro, em horas de Brasília.</p>
            <ColumnChart data={data.byHour.map((h) => ({ label: `${h.hour}h`, value: h.orders }))} />
          </GlassCard>
        </>
      )}
    </>
  );
}

export default function ReportsPage() {
  return (
    <Shell roles={['restaurant_admin']}>
      <Reports />
    </Shell>
  );
}
