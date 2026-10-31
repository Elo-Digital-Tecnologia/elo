'use client';

import { BellRing, ClipboardList, Star, Table2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, useRealtime } from '@elo/client';
import { formatBRL, type OrderView, type ReportView, type TableView, type WaiterCallView } from '@elo/core';
import {
  AreaChart,
  BarList,
  Badge,
  Donut,
  EmptyState,
  ErrorState,
  GlassCard,
  PageHeader,
  SkeletonCards,
  Stagger,
  StaggerItem,
  Stat,
} from '@elo/ui';
import { RequireRoles, useStaff } from '../../_components/shell';

const STATUS: Record<string, { label: string; tone: 'info' | 'brand' | 'warning' | 'success' | 'danger' }> = {
  sent: { label: 'Enviado', tone: 'info' },
  received: { label: 'Recebido', tone: 'brand' },
  preparing: { label: 'Em preparo', tone: 'warning' },
  ready: { label: 'Pronto', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
  returned: { label: 'Devolvido', tone: 'danger' },
};

/** Dia local no formato da API. */
const today = () => new Date().toLocaleDateString('sv-SE');

function Overview() {
  const { token } = useStaff();
  const [report, setReport] = useState<ReportView | null>(null);
  const [live, setLive] = useState<OrderView[]>([]);
  const [calls, setCalls] = useState<WaiterCallView[]>([]);
  const [tables, setTables] = useState<TableView[]>([]);
  const [failed, setFailed] = useState(false);
  const [rating, setRating] = useState<{ average: number; count: number } | null>(null);
  const { slug } = useParams<{ slug: string }>();

  const load = useCallback(async () => {
    try {
      const day = today();
      // Os números vêm agregados do servidor; só os pedidos recentes vão para o navegador.
      const [r, o, c, t] = await Promise.all([
        api<ReportView>(`/api/reports?from=${day}&to=${day}`, { token }),
        api<OrderView[]>('/api/orders?limit=30', { token }),
        api<WaiterCallView[]>('/api/calls', { token }),
        api<TableView[]>('/api/tables', { token }),
      ]);
      setReport(r);
      setLive(o);
      setCalls(c);
      setTables(t);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<{ average: number; count: number }>('/api/reviews', { token }).then(setRating).catch(() => undefined);
  }, [token]);

  // Vários eventos seguidos viram uma única atualização.
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const soon = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(), 1200);
  }, [load]);
  useEffect(() => () => clearTimeout(timer.current), []);

  useRealtime({ 'order.created': soon, 'order.updated': soon, 'order.cancelled': soon, 'call.created': soon, 'call.resolved': soon, 'table.updated': soon }, token, true, { onResync: soon });

  const view = useMemo(() => {
    if (!report) return null;
    const { totals } = report;
    const now = new Date().getHours();
    const byHour = Array.from({ length: 12 }, (_, i) => {
      const h = (now - 11 + i + 24) % 24;
      return { label: `${h}h`, value: report.byHour[h]?.orders ?? 0 };
    });
    const byStatus = [
      { label: 'Válidos', value: totals.orders },
      { label: 'Cancelados', value: totals.cancelled },
      { label: 'Devolvidos', value: totals.returned },
    ];
    return {
      inProgress: live.filter((o) => ['sent', 'received', 'preparing'].includes(o.status)).length,
      revenue: totals.revenueCents,
      byHour,
      byStatus,
      top: report.topProducts.slice(0, 5).map((p) => ({ label: p.name, value: p.quantity })),
      recent: [...live].reverse().slice(0, 6),
      total: totals.orders + totals.cancelled + totals.returned,
    };
  }, [report, live]);

  if (failed) return <ErrorState action={<button className="text-brand underline" onClick={load}>Tentar de novo</button>}>Não conseguimos buscar os dados do restaurante.</ErrorState>;
  if (!view) return <SkeletonCards count={4} />;

  return (
    <>
      <PageHeader
        title="Visão geral"
        description="Movimento de hoje."
        actions={
          rating && rating.count > 0 ? (
            <Link href={`/r/${slug}/dashboard/reviews`} className="surface inline-flex items-center gap-2 !rounded-pill px-4 py-2 text-sm font-semibold transition hover:text-brand">
              <Star size={16} className="fill-accent text-accent" aria-hidden /> {rating.average.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} · {rating.count} {rating.count === 1 ? 'avaliação' : 'avaliações'}
            </Link>
          ) : undefined
        }
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StaggerItem><Stat label="Pedidos em andamento" value={view.inProgress} icon={ClipboardList} trend={view.byHour.map((h) => h.value)} hint={`${view.total} hoje`} /></StaggerItem>
        <StaggerItem><Stat label="Faturamento hoje" value={view.revenue / 100} format={(n) => formatBRL(n * 100)} icon={Wallet} hint="Sem cancelados e devolvidos" /></StaggerItem>
        <StaggerItem><Stat label="Chamados pendentes" value={calls.length} icon={BellRing} hint={calls.length ? 'Garçom precisa atender' : 'Tudo atendido'} /></StaggerItem>
        <StaggerItem><Stat label="Mesas abertas" value={tables.filter((t) => t.state === 'open').length} icon={Table2} hint={`${tables.length} cadastradas`} /></StaggerItem>
      </Stagger>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Pedidos por hora</h2>
          <p className="mb-3 text-sm text-muted">Últimas 12 horas, só pedidos válidos.</p>
          <AreaChart data={view.byHour} name="Pedidos por hora" />
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="mb-3 text-lg font-semibold">Pedidos por status</h2>
          {view.total ? <Donut data={view.byStatus} center={{ value: String(view.total), label: 'pedidos hoje' }} /> : <p className="text-sm text-muted">Nenhum pedido hoje ainda.</p>}
        </GlassCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Itens mais pedidos</h2>
          {view.top.length ? <BarList data={view.top} format={(n) => `${n}x`} /> : <p className="text-sm text-muted">Os itens mais pedidos aparecem aqui assim que chegarem pedidos.</p>}
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Últimos pedidos</h2>
          {view.recent.length ? (
            <Stagger className="space-y-2.5">
              {view.recent.map((o) => (
                <StaggerItem key={o.id}>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-leaf-100/40 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold">{o.tableName}</div>
                      <div className="truncate text-muted">{o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}</div>
                    </div>
                    <Badge tone={STATUS[o.status].tone} dot>{STATUS[o.status].label}</Badge>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState icon={ClipboardList} title="Nenhum pedido ainda">Os pedidos enviados pelos clientes aparecem aqui.</EmptyState>
          )}
        </GlassCard>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <RequireRoles roles={['restaurant_admin', 'manager']}>
      <Overview />
    </RequireRoles>
  );
}
