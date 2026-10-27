'use client';

import { BellRing, ClipboardList, Table2, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, useRealtime } from '@elo/client';
import { formatBRL, type OrderView, type TableView, type WaiterCallView } from '@elo/core';
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
import { Shell, useStaff } from '../_components/shell';

const STATUS: Record<string, { label: string; tone: 'info' | 'brand' | 'warning' | 'success' | 'danger' }> = {
  sent: { label: 'Enviado', tone: 'info' },
  received: { label: 'Recebido', tone: 'brand' },
  preparing: { label: 'Em preparo', tone: 'warning' },
  ready: { label: 'Pronto', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
};

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const orderTotal = (o: OrderView) => o.items.reduce((s, i) => s + i.unitCents * i.quantity, 0);

function Overview() {
  const { token } = useStaff();
  const [orders, setOrders] = useState<OrderView[] | null>(null);
  const [calls, setCalls] = useState<WaiterCallView[]>([]);
  const [tables, setTables] = useState<TableView[]>([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, c, t] = await Promise.all([
        api<OrderView[]>('/api/orders', { token }),
        api<WaiterCallView[]>('/api/calls', { token }),
        api<TableView[]>('/api/tables', { token }),
      ]);
      setOrders(o);
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

  useRealtime({ 'order.created': load, 'order.updated': load, 'order.cancelled': load, 'call.created': load, 'call.resolved': load, 'table.updated': load }, token);

  const view = useMemo(() => {
    const today = (orders ?? []).filter((o) => isToday(o.createdAt));
    const live = today.filter((o) => o.status !== 'cancelled');
    const now = new Date().getHours();
    const byHour = Array.from({ length: 12 }, (_, i) => {
      const h = (now - 11 + i + 24) % 24;
      return { label: `${h}h`, value: live.filter((o) => new Date(o.createdAt).getHours() === h).length };
    });
    const byStatus = Object.keys(STATUS).map((k) => ({ label: STATUS[k].label, value: today.filter((o) => o.status === k).length }));
    const items = new Map<string, number>();
    for (const o of live) for (const i of o.items) items.set(i.name, (items.get(i.name) ?? 0) + i.quantity);
    const top = [...items.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));
    return {
      inProgress: today.filter((o) => ['sent', 'received', 'preparing'].includes(o.status)).length,
      revenue: live.reduce((s, o) => s + orderTotal(o), 0),
      byHour,
      byStatus,
      top,
      recent: [...(orders ?? [])].reverse().slice(0, 6),
      total: today.length,
    };
  }, [orders]);

  if (failed) return <ErrorState action={<button className="text-brand underline" onClick={load}>Tentar de novo</button>}>Não conseguimos buscar os dados do restaurante.</ErrorState>;
  if (!orders) return <SkeletonCards count={4} />;

  return (
    <>
      <PageHeader title="Visão geral" description="O que está acontecendo no salão e na cozinha hoje." />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StaggerItem><Stat label="Pedidos em andamento" value={view.inProgress} icon={ClipboardList} trend={view.byHour.map((h) => h.value)} hint={`${view.total} hoje`} /></StaggerItem>
        <StaggerItem><Stat label="Faturamento hoje" value={view.revenue / 100} format={(n) => formatBRL(n * 100)} icon={Wallet} hint="Sem pedidos cancelados" /></StaggerItem>
        <StaggerItem><Stat label="Chamados pendentes" value={calls.length} icon={BellRing} hint={calls.length ? 'Garçom precisa atender' : 'Tudo atendido'} /></StaggerItem>
        <StaggerItem><Stat label="Mesas abertas" value={tables.filter((t) => t.state === 'open').length} icon={Table2} hint={`${tables.length} cadastradas`} /></StaggerItem>
      </Stagger>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Pedidos por hora</h2>
          <p className="mb-3 text-sm text-muted">Últimas 12 horas, sem cancelados.</p>
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
            <EmptyState icon={ClipboardList} title="Nenhum pedido ainda">Quando um cliente enviar a comanda, ela aparece aqui em tempo real.</EmptyState>
          )}
        </GlassCard>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Shell roles={['restaurant_admin']}>
      <Overview />
    </Shell>
  );
}
