'use client';

import { ChefHat, Clock, OctagonAlert, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, upsertOrder, useRealtime } from '@elo/client';
import { nextOrderStatus, previousOrderStatus, type OrderStatus, type OrderView } from '@elo/core';
import { AnimatePresence, Badge, Button, EmptyState, GlassCard, motion, PageHeader } from '@elo/ui';
import { RequireRoles, useStaff } from '../../_components/shell';

const NEXT_LABEL: Record<string, string> = {
  received: 'Marcar recebido',
  preparing: 'Iniciar preparo',
  ready: 'Marcar pronto',
};

const STATUS_TONE = { sent: 'info', received: 'brand', preparing: 'warning' } as const;
const STATUS_LABEL = { sent: 'Novo', received: 'Recebido', preparing: 'Em preparo' } as const;

const IN_PROGRESS = ['sent', 'received', 'preparing'];
/** A "ready" order leaves the board; this long the kitchen can still take it back. */
const UNDO_READY_MS = 10_000;

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
  const { token, roles, impersonated } = useStaff();
  // The order status belongs to the kitchen; anyone else (an administrator, Elo support) only watches.
  const cooks = roles.includes('kitchen') && !impersonated;
  const now = useNow();
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [alerts, setAlerts] = useState<Map<string, OrderView>>(new Map());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const list = await api<OrderView[]>('/api/orders?status=sent,received,preparing&limit=200', { token });
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

  // O evento já traz o pedido inteiro: aplica no estado em vez de refazer o GET da lista.
  const onOrder = useCallback((o: OrderView) => {
    setOrders((list) => upsertOrder(list, o, (x) => IN_PROGRESS.includes(x.status)));
    if (!seen.current?.has(o.id) && IN_PROGRESS.includes(o.status)) {
      seen.current?.add(o.id);
      setFresh((f) => new Set(f).add(o.id));
      setTimeout(() => setFresh((f) => new Set([...f].filter((id) => id !== o.id))), 1600);
    }
  }, []);

  useRealtime(
    {
      'order.created': onOrder,
      'order.updated': onOrder,
      'order.cancelled': (o: OrderView) => {
        if (o.alertKitchen) setAlerts((a) => new Map(a).set(o.id, o));
        onOrder(o);
      },
    },
    token,
    true,
    { onResync: load },
  );

  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<OrderView | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const change = async (o: OrderView, path: string, body?: unknown) => {
    setError(null);
    try {
      const saved = await api<OrderView>(`/api/orders/${o.id}/${path}`, { method: 'PATCH', body, token });
      onOrder({ ...o, ...saved });
      return saved;
    } catch (e) {
      // A 409 means another screen moved it first: the list reloads to show where it is now.
      setError(
        e instanceof ApiError && e.status === 409
          ? 'O pedido mudou em outra tela. A lista foi atualizada.'
          : e instanceof ApiError && e.status === 403
            ? 'Só quem tem o perfil Cozinha muda o status dos pedidos.'
            : 'Não foi possível mudar o pedido. Tente de novo.',
      );
      void load();
      return null;
    }
  };

  const advance = async (o: OrderView) => {
    const next = nextOrderStatus(o.status as OrderStatus);
    if (!next) return;
    const saved = await change(o, 'status', { status: next });
    if (saved && next === 'ready') {
      clearTimeout(undoTimer.current);
      setUndo({ ...o, ...saved });
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_READY_MS);
    }
  };

  const revert = async (o: OrderView) => {
    if (undo?.id === o.id) {
      clearTimeout(undoTimer.current);
      setUndo(null);
    }
    await change(o, 'revert');
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
        description={cooks ? undefined : 'Só visualização: o status dos pedidos é mudado pela equipe com o perfil Cozinha.'}
        actions={
          <Badge tone="brand" dot>
            {visible.length} em andamento
          </Badge>
        }
      />
      {error && <p role="alert" className="mb-4 text-sm text-warning">{error}</p>}
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
                  {cooks && (
                    <div className="mt-5 flex gap-2">
                      {previousOrderStatus(o.status as OrderStatus) && (
                        <Button variant="ghost" className="!px-4 !py-3.5" onClick={() => revert(o)} aria-label="Voltar um passo" title="Voltar um passo">
                          <Undo2 size={18} /> Voltar
                        </Button>
                      )}
                      {next && <Button className="min-w-0 flex-1 !py-3.5 text-base" onClick={() => advance(o)}>{NEXT_LABEL[next]}</Button>}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {visible.length === 0 && alerts.size === 0 && (
        <EmptyState icon={ChefHat} title="Sem pedidos">Nenhum pedido em andamento.</EmptyState>
      )}
      <AnimatePresence>
        {undo && (
          <motion.div
            role="status"
            className="glass glass-strong fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 !rounded-pill py-2 pl-5 pr-2"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
          >
            <span className="min-w-0 truncate text-sm"><strong>{undo.tableName}</strong> marcado como pronto</span>
            <Button variant="ghost" onClick={() => revert(undo)}><Undo2 size={16} /> Desfazer</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function KitchenPage() {
  return (
    <RequireRoles roles={['kitchen', 'restaurant_admin', 'manager']}>
      <Board />
    </RequireRoles>
  );
}
