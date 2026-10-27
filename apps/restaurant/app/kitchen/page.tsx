'use client';

import { ChefHat, Clock, OctagonAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, useRealtime } from '@elo/client';
import { nextOrderStatus, type OrderStatus, type OrderView } from '@elo/core';
import { AnimatePresence, Badge, Button, EmptyState, GlassCard, motion, PageHeader } from '@elo/ui';
import { Shell, useStaff } from '../_components/shell';

const NEXT_LABEL: Record<string, string> = {
  received: 'Marcar recebido',
  preparing: 'Iniciar preparo',
  ready: 'Marcar pronto',
};

const STATUS_TONE = { sent: 'info', received: 'brand', preparing: 'warning' } as const;
const STATUS_LABEL = { sent: 'Novo', received: 'Recebido', preparing: 'Em preparo' } as const;

function useNow(everyMs = 20_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));

/** Tela da cozinha (pensada para TV): cards por ordem de chegada, mesa no canto superior direito. */
function Board() {
  const { token } = useStaff();
  const now = useNow();
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [alerts, setAlerts] = useState<Map<string, OrderView>>(new Map());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const list = await api<OrderView[]>('/api/orders?status=sent,received,preparing', { token });
    const ids = new Set(list.map((o) => o.id));
    if (seen.current) {
      const added = list.filter((o) => !seen.current!.has(o.id)).map((o) => o.id);
      if (added.length) {
        setFresh((f) => new Set([...f, ...added]));
        setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !added.includes(id)))), 1600);
      }
    }
    seen.current = ids;
    setOrders(list);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(
    {
      'order.created': load,
      'order.updated': load,
      'order.cancelled': (o: OrderView) => {
        if (o.alertKitchen) setAlerts((a) => new Map(a).set(o.id, o));
        void load();
      },
    },
    token,
  );

  const advance = async (o: OrderView) => {
    const next = nextOrderStatus(o.status as OrderStatus);
    if (next) await api(`/api/orders/${o.id}/status`, { method: 'PATCH', body: { status: next }, token });
    await load();
  };

  const dismiss = (id: string) =>
    setAlerts((a) => {
      const n = new Map(a);
      n.delete(id);
      return n;
    });

  const visible = orders.filter((o) => !alerts.has(o.id));

  return (
    <>
      <PageHeader
        title="Cozinha"
        description="Pedidos na ordem de chegada."
        actions={
          <Badge tone="brand" dot>
            {visible.length} em andamento
          </Badge>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {[...alerts.values()].map((o) => (
            <motion.div key={`alert-${o.id}`} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <GlassCard strong className="flash-new h-full border-danger/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 font-bold text-danger"><OctagonAlert size={22} /> Pedido cancelado</span>
                  <span className="font-display text-3xl font-extrabold">{o.tableName}</span>
                </div>
                <p className="mt-3 text-muted">Pare o preparo deste pedido.</p>
                <ul className="mt-2 text-sm">
                  {o.items.map((i, idx) => <li key={idx}>{i.quantity}x {i.name}</li>)}
                </ul>
                <Button className="mt-4 w-full" variant="danger" onClick={() => dismiss(o.id)}>Ciente</Button>
              </GlassCard>
            </motion.div>
          ))}
          {visible.map((o) => {
            const mins = minutesSince(o.createdAt, now);
            const late = mins >= 20;
            const next = nextOrderStatus(o.status as OrderStatus);
            return (
              <motion.div key={o.id} layout initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
                <GlassCard strong className={`flex h-full flex-col p-5 ${fresh.has(o.id) ? 'flash-new' : ''}`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-2">
                      <Badge tone={STATUS_TONE[o.status as keyof typeof STATUS_TONE]} dot>{STATUS_LABEL[o.status as keyof typeof STATUS_LABEL]}</Badge>
                      <span className={`flex items-center gap-1.5 text-sm ${late ? 'font-semibold text-danger' : 'text-muted'}`}>
                        <Clock size={15} /> {mins === 0 ? 'agora' : `${mins} min`}
                      </span>
                    </div>
                    <span className="font-display text-4xl font-extrabold leading-none">{o.tableName}</span>
                  </div>
                  <ul className="flex-1 space-y-2">
                    {o.items.map((i, idx) => (
                      <li key={idx} className="text-lg leading-snug">
                        <span className="font-bold">{i.quantity}x</span> {i.name}
                        {i.options.length > 0 && <span className="block text-sm text-muted">{i.options.map((x) => x.label).join(' · ')}</span>}
                        {i.notes && <span className="mt-0.5 block rounded-sm bg-accent/40 px-2 py-1 text-sm font-medium">Obs: {i.notes}</span>}
                      </li>
                    ))}
                  </ul>
                  {next && <Button className="mt-5 w-full !py-3.5 text-base" onClick={() => advance(o)}>{NEXT_LABEL[next]}</Button>}
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {visible.length === 0 && alerts.size === 0 && (
        <EmptyState icon={ChefHat} title="Cozinha em dia">Nenhum pedido em andamento. Novas comandas aparecem aqui sozinhas.</EmptyState>
      )}
    </>
  );
}

export default function KitchenPage() {
  return (
    <Shell roles={['kitchen', 'restaurant_admin']}>
      <Board />
    </Shell>
  );
}
