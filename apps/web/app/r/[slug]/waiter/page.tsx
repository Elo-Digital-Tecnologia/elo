'use client';

import { BellRing, CheckCheck, DoorOpen, Receipt, Utensils } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, upsertOrder, useRealtime } from '@elo/client';
import type { OrderView, TableView, WaiterCallView } from '@elo/core';
import { AnimatePresence, Badge, Button, EmptyState, GlassCard, Modal, motion, PageHeader } from '@elo/ui';
import { Shell, useStaff } from '../_components/shell';

const ACTIVE = ['sent', 'received', 'preparing', 'ready'];

function Panel() {
  const { token, role } = useStaff();
  const [tables, setTables] = useState<TableView[]>([]);
  const [calls, setCalls] = useState<WaiterCallView[]>([]);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<{ order: OrderView; kind: 'cancel' | 'return' } | null>(null);
  const [reason, setReason] = useState('');
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const [t, c, o] = await Promise.all([
      api<TableView[]>('/api/tables', { token }),
      api<WaiterCallView[]>('/api/calls', { token }),
      api<OrderView[]>('/api/orders?status=sent,received,preparing,ready&limit=200', { token }),
    ]);
    const keys = new Set([...c.map((x) => x.id), ...t.filter((x) => x.state.startsWith('pending')).map((x) => `${x.id}:${x.state}`)]);
    if (seen.current) {
      const added = [...keys].filter((k) => !seen.current!.has(k));
      if (added.length) {
        setFresh((f) => new Set([...f, ...added]));
        setTimeout(() => setFresh((f) => new Set([...f].filter((k) => !added.includes(k)))), 1600);
      }
    }
    seen.current = keys;
    setTables(t);
    setCalls(c);
    setOrders(o);
  }, [token]);

  useEffect(() => {
    load().catch(() => setError('Não foi possível carregar o salão.'));
  }, [load]);

  // Rajada de eventos vira uma única recarga; falha de rede não derruba a tela.
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const reload = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void load().catch(() => undefined), 800);
  }, [load]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Pedidos entram no estado pelo próprio evento; mesas e chamados são listas pequenas.
  const onOrder = useCallback((o: OrderView) => setOrders((list) => upsertOrder(list, o, (x) => ACTIVE.includes(x.status))), []);
  useRealtime({ 'table.updated': reload, 'call.created': reload, 'call.resolved': reload, 'order.created': onOrder, 'order.updated': onOrder, 'order.cancelled': onOrder }, token);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Não foi possível concluir a ação.');
    }
  };

  const post = (path: string, body: unknown = {}) => () => api(path, { method: 'POST', body, token });

  const confirmAction = async () => {
    if (!acting || reason.trim().length < 3) return;
    await run(post(`/api/orders/${acting.order.id}/${acting.kind}`, { reason }));
    setActing(null);
    setReason('');
  };

  const isWaiter = role === 'waiter';
  const pendingOpen = tables.filter((t) => t.state === 'pending_open');
  const pendingClose = tables.filter((t) => t.state === 'pending_close');
  const open = tables.filter((t) => t.state === 'open');

  return (
    <>
      <PageHeader title="Salão" />
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <Column title="Chamados" icon={BellRing} count={calls.length}>
          {calls.map((c) => (
            <Item key={c.id} fresh={fresh.has(c.id)}>
              <div><strong className="text-lg">{c.tableName ?? 'Mesa'}</strong><div className="text-sm text-muted">pediu atendimento</div></div>
              <Button disabled={!isWaiter && role !== 'restaurant_admin'} onClick={() => run(post(`/api/calls/${c.id}/resolve`))}><CheckCheck size={16} /> Atendido</Button>
            </Item>
          ))}
          {calls.length === 0 && <Quiet text="Nenhum chamado agora." />}
        </Column>

        <Column title="Abertura de mesa" icon={DoorOpen} count={pendingOpen.length}>
          {pendingOpen.map((t) => (
            <Item key={t.id} fresh={fresh.has(`${t.id}:pending_open`)}>
              <div><strong className="text-lg">{t.name}</strong><div className="text-sm text-muted">quer abrir a mesa</div></div>
              <div className="flex gap-2">
                <Button disabled={!isWaiter} onClick={() => run(post(`/api/tables/${t.id}/validate-open`))}>Validar</Button>
                <Button disabled={!isWaiter} variant="ghost" onClick={() => run(post(`/api/tables/${t.id}/reject-open`))}>Recusar</Button>
              </div>
            </Item>
          ))}
          {pendingOpen.length === 0 && <Quiet text="Nenhuma mesa aguardando validação." />}
        </Column>

        <Column title="Fechamento de conta" icon={Receipt} count={pendingClose.length}>
          {pendingClose.map((t) => (
            <Item key={t.id} fresh={fresh.has(`${t.id}:pending_close`)}>
              <div><strong className="text-lg">{t.name}</strong><div className="text-sm text-muted">pediu a conta</div></div>
              <Button disabled={!isWaiter} onClick={() => run(post(`/api/tables/${t.id}/close`))}>Fechar mesa</Button>
            </Item>
          ))}
          {pendingClose.length === 0 && <Quiet text="Nenhuma conta pedida." />}
        </Column>
      </div>

      <h2 className="mb-4 mt-8 flex items-center gap-2 text-xl font-semibold"><Utensils size={20} className="text-brand" /> Mesas abertas</h2>
      {open.length === 0 ? (
        <EmptyState icon={Utensils} title="Nenhuma mesa aberta">As mesas abertas aparecem aqui.</EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {open.map((t) => (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard lift className="h-full p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <strong className="font-display text-2xl">{t.name}</strong>
                    <Button disabled={!isWaiter} variant="ghost" onClick={() => run(post(`/api/tables/${t.id}/close`))}>Fechar mesa</Button>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {orders.filter((o) => o.tableId === t.id).map((o) => (
                      <li key={o.id} className="flex items-start justify-between gap-3 rounded-md bg-leaf-100/40 px-3 py-2.5">
                        <span><Badge tone={o.status === 'ready' ? 'success' : o.status === 'preparing' ? 'warning' : 'info'}>{o.status === 'ready' ? 'Pronto' : o.status === 'preparing' ? 'Em preparo' : o.status === 'received' ? 'Recebido' : 'Enviado'}</Badge>
                          <span className="mt-1.5 block text-muted">{o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}</span></span>
                        <button className="shrink-0 text-danger underline-offset-2 hover:underline" onClick={() => setActing({ order: o, kind: o.status === 'ready' ? 'return' : 'cancel' })}>{o.status === 'ready' ? 'Devolver' : 'Cancelar'}</button>
                      </li>
                    ))}
                    {orders.every((o) => o.tableId !== t.id) && <li className="text-muted">Sem pedidos ainda.</li>}
                  </ul>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={!!acting} onClose={() => setActing(null)} title={acting?.kind === 'return' ? 'Devolver pedido' : 'Cancelar pedido'} sheet>
        <p className="mb-3 text-sm text-muted">
          {acting?.kind === 'return'
            ? 'O pedido já saiu da cozinha. Informe o motivo da devolução; ele deixa de contar na conta.'
            : 'Informe o motivo. A cozinha é avisada se o preparo já começou.'}
        </p>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={acting?.kind === 'return' ? 'Ex.: chegou frio, cliente recusou' : 'Ex.: cliente desistiu do item'} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setActing(null)}>Voltar</Button>
          <Button variant="danger" disabled={reason.trim().length < 3} onClick={confirmAction}>{acting?.kind === 'return' ? 'Devolver pedido' : 'Cancelar pedido'}</Button>
        </div>
      </Modal>
    </>
  );
}

function Column({ title, icon: Icon, count, children }: { title: string; icon: typeof BellRing; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Icon size={19} className="text-brand" /> {title}
        {count > 0 && <span className="ml-1 grid min-w-6 place-items-center rounded-pill bg-accent px-2 text-xs font-bold text-accent-fg">{count}</span>}
      </h2>
      <div className="space-y-3"><AnimatePresence mode="popLayout">{children}</AnimatePresence></div>
    </section>
  );
}

function Item({ children, fresh }: { children: React.ReactNode; fresh?: boolean }) {
  return (
    <motion.div layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ type: 'spring', stiffness: 360, damping: 30 }}>
      <GlassCard className={`flex items-center justify-between gap-3 p-4 ${fresh ? 'flash-new' : ''}`}>{children}</GlassCard>
    </motion.div>
  );
}

const Quiet = ({ text }: { text: string }) => <p className="rounded-lg border border-dashed border-line/60 px-4 py-6 text-center text-sm text-muted">{text}</p>;

export default function WaiterPage() {
  return (
    <Shell roles={['waiter', 'restaurant_admin']}>
      <Panel />
    </Shell>
  );
}
