'use client';

import { BellRing, Check, Lock, Minus, Plus, Trash2, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, useRealtime } from '@elo/client';
import { formatBRL, type ProductView, type SessionStateView } from '@elo/core';
import { AnimatePresence, Button, Sheet } from '@elo/ui';
import { BillPanel } from '../../_components/bill-panel';
import { MenuFooter } from '../../_components/menu-chrome';
import { CartBar } from '../../_components/menu/cart-bar';
import { MenuHeader } from '../../_components/menu/header';
import { CategoryTabs, filterMenu, Highlights, MenuList, MenuSearch } from '../../_components/menu-list';
import { RestaurantInfo } from '../../_components/menu/info';
import { ReviewForm } from '../../_components/menu/review-form';
import { Notice } from '../../_components/notice';
import { OrderTracker } from '../../_components/order-tracker';
import { CartLine, lineUnit, ProductSheet } from '../../_components/product-sheet';

type Phase = 'loading' | 'ready' | 'invalid' | 'in_use' | 'ended' | 'error';
type View = 'menu' | 'orders' | 'bill';

const HINT: Record<string, string> = {
  closed: 'Escolha os itens e abra a mesa.',
  pending_open: 'Aguardando o garçom confirmar a mesa.',
  open: 'Mesa aberta. Envie a comanda quando quiser.',
  pending_close: 'Conta pedida. O garçom vai fechar a mesa.',
};

const ACTION = 'rounded-[18px] bg-white/95 px-5 py-3 text-sm font-bold text-leaf-700 shadow-sm transition active:scale-95 disabled:opacity-60';

export default function TableMenu({ params }: { params: { slug: string; token: string } }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [state, setState] = useState<SessionStateView | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picked, setPicked] = useState<ProductView | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [called, setCalled] = useState(false);
  const [view, setView] = useState<View>('menu');
  const [billVersion, setBillVersion] = useState(0);
  const [query, setQuery] = useState('');
  const cartKey = `elo.cart.${params.slug}.${params.token}`;
  const [cartLoaded, setCartLoaded] = useState(false);

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

  useRealtime(
    {
      'table.updated': refresh,
      'order.created': refresh,
      'order.updated': refresh,
      'order.cancelled': refresh,
      'bill.updated': () => setBillVersion((v) => v + 1),
    },
    null,
    phase === 'ready',
  );

  // Garçom encerrou a mesa: a sessão cai e o estado volta a falhar com 401.
  useEffect(() => {
    if (state?.table.state === 'closed' && phase === 'ready') void refresh();
  }, [state?.table.state, phase, refresh]);

  // Conta pedida: leva o cliente para a aba Conta, onde está a avaliação do atendimento.
  const tableStateNow = state?.table.state;
  useEffect(() => {
    if (tableStateNow === 'pending_close') setView('bill');
  }, [tableStateNow]);

  // Carrinho salvo no aparelho: sobrevive a recarregar a página.
  useEffect(() => {
    if (!state || cartLoaded) return;
    try {
      const saved = JSON.parse(localStorage.getItem(cartKey) ?? '[]') as { productId: string; quantity: number; notes: string; options: CartLine['options'] }[];
      const products = new Map(state.menu.flatMap((c) => c.products).map((p) => [p.id, p]));
      setCart(saved.flatMap((l) => (products.has(l.productId) ? [{ product: products.get(l.productId)!, quantity: l.quantity, notes: l.notes, options: l.options }] : [])));
    } catch {
      /* carrinho salvo ilegível: começa vazio */
    }
    setCartLoaded(true);
  }, [state, cartLoaded, cartKey]);

  useEffect(() => {
    if (!cartLoaded) return;
    try {
      localStorage.setItem(cartKey, JSON.stringify(cart.map((l) => ({ productId: l.product.id, quantity: l.quantity, notes: l.notes, options: l.options }))));
    } catch {
      /* storage indisponível */
    }
  }, [cart, cartLoaded, cartKey]);

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
      <main className="mx-auto max-w-2xl" aria-busy>
        <div className="skeleton h-36 !rounded-none sm:h-48" />
        <div className="space-y-4 p-4"><div className="skeleton h-8 w-2/3" /><div className="skeleton h-24" /><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
      </main>
    );
  if (phase === 'invalid') return <Notice title="Link não reconhecido" icon={<Lock size={30} />}>Este QR Code ou tag não é válido. Chame o garçom.</Notice>;
  if (phase === 'in_use') return <Notice title="Mesa em atendimento" icon={<Lock size={30} />}>Esta mesa já está aberta em outro aparelho. Chame o garçom se precisar.</Notice>;
  if (phase === 'ended') return <Notice title="Atendimento encerrado" icon={<Check size={30} />}>Obrigado pela visita! Para pedir de novo, escaneie o QR Code da mesa.</Notice>;
  if (phase === 'error' || !state) return <Notice title="Algo deu errado" icon={<WifiOff size={30} />}>Não foi possível carregar o cardápio. Tente de novo em instantes.</Notice>;

  const tableState = state.table.state;
  const visible = filterMenu(state.menu, query);
  const total = cart.reduce((s, l) => s + lineUnit(l) * l.quantity, 0);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const activeOrders = state.orders.filter((o) => !['ready', 'cancelled', 'returned'].includes(o.status)).length;
  const showTabs = tableState !== 'closed' || state.orders.length > 0;

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
      setView('orders');
    }
  };

  const openTable = async () => {
    if (await act(() => api('/api/public/session/open', { body: {} }))) setCartOpen(false);
  };

  const callWaiter = async () => {
    if (await act(() => api('/api/public/session/call', { method: 'POST', body: {} }))) {
      setCalled(true);
      setTimeout(() => setCalled(false), 3500);
    }
  };

  // Uma ação principal por estado da mesa.
  const primary = (className: string) =>
    tableState === 'closed' ? (
      <button className={className} disabled={busy} onClick={openTable}>Abrir mesa</button>
    ) : tableState === 'open' ? (
      <button className={className} disabled={busy} onClick={sendOrder}>Enviar comanda</button>
    ) : tableState === 'pending_open' ? (
      <span className="px-3 text-sm font-semibold opacity-90">Aguardando o garçom</span>
    ) : null;

  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-28">
      <MenuHeader
        name={state.restaurant.name}
        coverUrl={state.restaurant.coverUrl}
        logoUrl={state.restaurant.logoUrl}
        action={
          <button onClick={callWaiter} disabled={busy || tableState === 'closed'} aria-label="Chamar garçom" className="glass flex h-10 items-center gap-2 !rounded-pill px-3.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50">
            {called ? <Check size={18} className="text-success" /> : <BellRing size={18} />}
            <span className="hidden sm:inline">{called ? 'Garçom avisado' : 'Chamar garçom'}</span>
          </button>
        }
      >
        <span className="rounded-pill bg-brand px-3 py-1 text-xs font-bold text-brand-fg">{state.table.name}</span>
        <span className="flex items-center gap-2"><span className="pulse-dot" aria-hidden /> {HINT[tableState]}</span>
      </MenuHeader>

      <RestaurantInfo profile={state.restaurant} />

      {message && <p role="alert" className="mx-4 mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{message}</p>}

      {showTabs && (
        <div className="px-4 pt-4">
          <div className="surface flex !rounded-pill p-1 text-sm font-semibold" role="tablist">
            {([['menu', 'Cardápio', 0], ['orders', 'Pedidos', activeOrders], ['bill', 'Conta', 0]] as const).map(([key, label, n]) => (
              <button key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-pill px-3 py-2.5 transition ${view === key ? 'bg-brand text-brand-fg shadow-sm' : 'text-muted hover:text-fg'}`}>
                {label}
                {n > 0 && <span className="grid min-w-5 place-items-center rounded-pill bg-accent px-1 text-xs font-bold text-accent-fg">{n}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'menu' && (
        <>
          <div className="px-4 pb-1 pt-4"><MenuSearch value={query} onChange={setQuery} /></div>
          {!query && <Highlights menu={state.menu} onPick={setPicked} />}
          <CategoryTabs menu={visible} />
          <MenuList menu={visible} onPick={setPicked} searching={!!query} />
          <div className="px-4 pt-6"><MenuFooter name={state.restaurant.name} /></div>
        </>
      )}

      {view === 'orders' && (
        <div className="space-y-3 px-4 pt-5">
          {state.orders.length === 0 && <p className="surface px-4 py-8 text-center text-sm text-muted">Nenhum pedido enviado ainda.</p>}
          {state.orders.map((o) => (
            <OrderTracker key={o.id} order={o} onCancel={() => act(() => api(`/api/public/session/orders/${o.id}/cancel`, { body: {} }))} />
          ))}
        </div>
      )}

      {view === 'bill' && (
        <BillPanel active version={billVersion}>
          {(tableState === 'open' || tableState === 'pending_close') && <ReviewForm />}
          {tableState === 'open' && <Button className="w-full !py-3.5" disabled={busy} onClick={() => act(() => api('/api/public/session/close', { body: {} }))}>Pedir a conta</Button>}
          {tableState === 'pending_close' && <p className="surface px-4 py-3 text-sm">Conta pedida. O garçom vai fechar a mesa.</p>}
        </BillPanel>
      )}

      <AnimatePresence>
        {view === 'menu' && cartCount > 0 && tableState !== 'pending_close' && (
          <CartBar key="cart" count={cartCount} totalCents={total} onOpen={() => setCartOpen(true)} action={primary(ACTION)} />
        )}
      </AnimatePresence>

      <ProductSheet product={picked} onClose={() => setPicked(null)} onAdd={(line) => { setCart((c) => [...c, line]); setPicked(null); }} />

      <Sheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Sua sacola"
        footer={
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-muted">Total</span>
              <span className="font-display text-2xl font-extrabold tabular-nums">{formatBRL(total)}</span>
            </div>
            {tableState === 'open' && <Button className="w-full !py-3.5" loading={busy} onClick={sendOrder}>Enviar comanda</Button>}
            {tableState === 'closed' && <Button className="w-full !py-3.5" loading={busy} onClick={openTable}>Abrir mesa</Button>}
            {tableState === 'pending_open' && <p className="surface px-4 py-3 text-center text-sm">Aguardando o garçom confirmar a mesa.</p>}
            {tableState === 'closed' && <p className="text-center text-xs text-muted">O garçom confirma a abertura antes de você enviar a comanda.</p>}
            {state.restaurant.serviceFeeBps > 0 && <p className="text-center text-xs text-muted">Taxa de serviço de {(state.restaurant.serviceFeeBps / 100).toLocaleString('pt-BR')}% na conta. Você pode recusá-la na aba Conta.</p>}
          </div>
        }
      >
        {cart.length === 0 && <p className="mt-4 text-sm text-muted">Sua sacola está vazia.</p>}
        <ul className="mt-4 divide-y divide-line/40">
          {cart.map((l, idx) => (
            <li key={idx} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-semibold">{l.product.name}</div>
                {l.options.length > 0 && <div className="text-muted">{l.options.map((o) => o.label).join(' · ')}</div>}
                {l.notes && <div className="text-muted">Obs.: {l.notes}</div>}
                <div className="mt-1 font-semibold tabular-nums text-brand">{formatBRL(lineUnit(l) * l.quantity)}</div>
              </div>
              <div className="surface flex items-center !rounded-pill p-0.5">
                <button aria-label={l.quantity === 1 ? `Remover ${l.product.name}` : 'Menos'} className="grid h-8 w-8 place-items-center rounded-pill hover:bg-brand/10" onClick={() => setCart((c) => (l.quantity === 1 ? c.filter((_, i) => i !== idx) : c.map((x, i) => (i === idx ? { ...x, quantity: x.quantity - 1 } : x))))}>
                  {l.quantity === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
                </button>
                <span className="w-6 text-center text-sm font-bold tabular-nums">{l.quantity}</span>
                <button aria-label="Mais" className="grid h-8 w-8 place-items-center rounded-pill hover:bg-brand/10" onClick={() => setCart((c) => c.map((x, i) => (i === idx ? { ...x, quantity: Math.min(50, x.quantity + 1) } : x)))}><Plus size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
