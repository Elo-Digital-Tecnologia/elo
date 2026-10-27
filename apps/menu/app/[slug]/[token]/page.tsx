'use client';

import { BellRing, Check, DoorOpen, Lock, ShoppingBag, Trash2, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, useRealtime } from '@elo/client';
import { formatBRL, type ProductView, type SessionStateView } from '@elo/core';
import { Aurora, Button, GlassCard, Logo, Modal, ThemeToggle, motion, AnimatePresence } from '@elo/ui';
import { CategoryNav, MenuList } from '../../_components/menu-list';
import { Notice } from '../../_components/notice';
import { OrderTracker } from '../../_components/order-tracker';
import { CartLine, lineUnit, ProductSheet } from '../../_components/product-sheet';

type Phase = 'loading' | 'ready' | 'invalid' | 'in_use' | 'ended' | 'error';

const HINT: Record<string, string> = {
  closed: 'Escolha seus itens e peça para abrir a mesa.',
  pending_open: 'O garçom já foi avisado e vai validar a sua mesa.',
  open: 'Mesa aberta. Envie a comanda quando estiver pronto.',
  pending_close: 'Conta pedida. O garçom vem fechar a mesa.',
};

export default function TableMenu({ params }: { params: { slug: string; token: string } }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [state, setState] = useState<SessionStateView | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picked, setPicked] = useState<ProductView | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [called, setCalled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await api<SessionStateView>('/api/public/session'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setPhase('ended');
    }
  }, []);

  useEffect(() => {
    api<SessionStateView>(`/api/public/${params.slug}/${params.token}/session`, { method: 'POST' })
      .then((s) => {
        setState(s);
        setPhase('ready');
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setPhase('invalid');
        else if (e instanceof ApiError && e.status === 409) setPhase('in_use');
        else setPhase('error');
      });
  }, [params.slug, params.token]);

  useRealtime({ 'table.updated': refresh, 'order.created': refresh, 'order.updated': refresh, 'order.cancelled': refresh }, null, phase === 'ready');

  // Garçom encerrou a mesa: a sessão cai e o estado volta a falhar com 401.
  useEffect(() => {
    if (state?.table.state === 'closed' && phase === 'ready') void refresh();
  }, [state?.table.state, phase, refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      await refresh();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setPhase('ended');
      else setMessage(e instanceof ApiError ? e.code : 'Falha de conexão. Tente de novo.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'loading')
    return (
      <main className="relative min-h-dvh p-4"><Aurora /><div className="mx-auto max-w-3xl space-y-4 pt-4"><div className="skeleton h-36" /><div className="skeleton h-14 w-2/3" /><div className="skeleton h-28" /><div className="skeleton h-28" /></div></main>
    );
  if (phase === 'invalid') return <Notice title="Link não reconhecido" icon={<Lock size={30} />}>Este QR Code ou tag não é válido. Chame o garçom para ajudar.</Notice>;
  if (phase === 'in_use') return <Notice title="Mesa em atendimento" icon={<Lock size={30} />}>Esta mesa já está sendo usada em outro aparelho. Chame o garçom se precisar de ajuda.</Notice>;
  if (phase === 'ended') return <Notice title="Atendimento encerrado" icon={<Check size={30} />}>Obrigado pela visita! Para uma nova refeição, escaneie o QR Code da mesa de novo.</Notice>;
  if (phase === 'error' || !state) return <Notice title="Algo deu errado" icon={<WifiOff size={30} />}>Não conseguimos carregar o cardápio. Tente de novo em instantes.</Notice>;

  const tableState = state.table.state;
  const total = cart.reduce((s, l) => s + lineUnit(l) * l.quantity, 0);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  const sendOrder = async () => {
    const ok = await act(() =>
      api('/api/public/session/orders', {
        body: {
          items: cart.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
            notes: l.notes || undefined,
            options: l.options.map((o) => ({ group: o.group, label: o.label })),
          })),
        },
      }),
    );
    if (ok) {
      setCart([]);
      setCartOpen(false);
    }
  };

  const callWaiter = async () => {
    if (await act(() => api('/api/public/session/call', { method: 'POST', body: {} }))) {
      setCalled(true);
      setTimeout(() => setCalled(false), 3500);
    }
  };

  return (
    <div className="relative min-h-dvh">
      <Aurora />
      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-44 pt-4">
        <motion.header initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <GlassCard strong className="relative overflow-hidden !rounded-xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <Logo />
              <div className="flex items-center gap-2">
                <button
                  onClick={callWaiter}
                  disabled={busy || tableState === 'closed'}
                  aria-label="Chamar garçom"
                  className="glass relative flex h-11 items-center gap-2 !rounded-pill px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-50"
                >
                  {called ? <Check size={18} className="text-success" /> : <BellRing size={18} />}
                  <span className="hidden sm:inline">{called ? 'Garçom avisado' : 'Chamar garçom'}</span>
                </button>
                <ThemeToggle />
              </div>
            </div>
            <h1 className="mt-8 text-5xl font-extrabold leading-[0.98] sm:text-6xl">{state.restaurant.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="btn-glass inline-flex items-center gap-2 rounded-pill px-4 py-1.5 text-sm font-bold">{state.table.name}</span>
              <span className="flex items-center gap-2 text-sm text-muted"><span className="pulse-dot" aria-hidden /> {HINT[tableState]}</span>
            </div>
          </GlassCard>
        </motion.header>

        {message && <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{message}</p>}

        {state.orders.length > 0 && (
          <section aria-labelledby="orders-title">
            <h2 id="orders-title" className="mb-4 text-3xl font-extrabold">Seus pedidos</h2>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {state.orders.map((o) => (
                  <motion.div key={o.id} layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <OrderTracker order={o} onCancel={() => act(() => api(`/api/public/session/orders/${o.id}/cancel`, { body: {} }))} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        <CategoryNav menu={state.menu} />
        <MenuList menu={state.menu} onPick={setPicked} />
      </main>

      {/* Barra de ação flutuante */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 26 }}>
          <GlassCard strong className="mx-auto flex max-w-3xl items-center justify-between gap-3 !rounded-pill py-2.5 pl-3 pr-2.5">
            <button onClick={() => cartCount && setCartOpen(true)} className="flex items-center gap-3 rounded-pill py-1 pl-1 pr-3 text-left transition hover:bg-brand/10" aria-label="Ver itens escolhidos">
              <span className="relative grid h-11 w-11 place-items-center rounded-pill bg-brand/15 text-brand">
                <ShoppingBag size={20} />
                {cartCount > 0 && <motion.span key={cartCount} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-pill bg-accent px-1 text-xs font-bold text-accent-fg">{cartCount}</motion.span>}
              </span>
              <span className="leading-tight">
                <span className="block text-xs text-muted">{cartCount ? 'Total escolhido' : 'Nenhum item ainda'}</span>
                <span className="block font-display text-lg font-bold tabular-nums">{formatBRL(total)}</span>
              </span>
            </button>

            {tableState === 'closed' && <Button disabled={busy || cartCount === 0} loading={busy} onClick={() => act(() => api('/api/public/session/open', { body: {} }))}><DoorOpen size={18} /> Abrir mesa</Button>}
            {tableState === 'pending_open' && <span className="px-4 text-sm font-medium text-muted">Aguardando o garçom…</span>}
            {tableState === 'open' && (
              <div className="flex gap-2">
                <Button variant="ghost" disabled={busy} onClick={() => act(() => api('/api/public/session/close', { body: {} }))}>Pedir a conta</Button>
                <Button disabled={busy || cartCount === 0} loading={busy} onClick={sendOrder}>Enviar comanda</Button>
              </div>
            )}
            {tableState === 'pending_close' && <span className="px-4 text-sm font-medium text-muted">Aguardando fechamento…</span>}
          </GlassCard>
        </motion.div>
      </div>

      <ProductSheet product={picked} onClose={() => setPicked(null)} onAdd={(line) => { setCart((c) => [...c, line]); setPicked(null); }} />

      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Seus itens" sheet>
        <ul className="space-y-3">
          {cart.map((l, idx) => (
            <li key={idx} className="flex items-start justify-between gap-3 rounded-md bg-leaf-100/40 px-4 py-3">
              <div className="min-w-0 text-sm">
                <div className="font-semibold">{l.quantity}x {l.product.name}</div>
                {l.options.length > 0 && <div className="text-muted">{l.options.map((o) => o.label).join(' · ')}</div>}
                {l.notes && <div className="text-muted">Obs: {l.notes}</div>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">{formatBRL(lineUnit(l) * l.quantity)}</span>
                <button aria-label={`Remover ${l.product.name}`} className="grid h-8 w-8 place-items-center rounded-pill text-muted hover:bg-danger/10 hover:text-danger" onClick={() => setCart((c) => c.filter((_, i) => i !== idx))}><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-line/40 pt-4">
          <span className="text-muted">Total</span>
          <span className="font-display text-2xl font-bold tabular-nums">{formatBRL(total)}</span>
        </div>
        {state.restaurant.serviceFeeBps > 0 && <p className="mt-1 text-xs text-muted">Taxa de serviço de {(state.restaurant.serviceFeeBps / 100).toLocaleString('pt-BR')}% é calculada na conta e pode ser retirada pelo garçom.</p>}
        {tableState === 'open' ? (
          <Button className="mt-4 w-full !py-3.5" loading={busy} onClick={sendOrder}>Enviar comanda</Button>
        ) : (
          <p className="mt-4 rounded-md bg-accent/30 px-4 py-3 text-sm">Abra a mesa para enviar a comanda à cozinha.</p>
        )}
      </Modal>
    </div>
  );
}
