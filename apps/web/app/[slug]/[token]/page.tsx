'use client';

import { BellRing, Check, DoorClosed, Lock, Minus, Plus, Smartphone, Timer, Trash2, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, useRealtime } from '@elo/client';
import { canRequestBill, type FieldError, fieldMessage, formatBRL, type ProductView, type SessionStateView } from '@elo/core';
import { AlertsProvider, AnimatePresence, Button, Sheet, unlockAlertSound } from '@elo/ui';
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
import { useGuestAlertHandlers, useGuestPush } from '../../_components/menu/guest-alerts';
import { unexpected } from '../../_lib/use-form';

type Phase = 'loading' | 'ready' | 'invalid' | 'in_use' | 'taken' | 'rejected' | 'expired' | 'ended' | 'error';
type View = 'menu' | 'orders' | 'bill';

const HINT: Record<string, string> = {
  closed: 'Escolha os itens e abra a mesa.',
  pending_open: 'Aguardando o garçom confirmar a mesa.',
  open: 'Mesa aberta. Envie a comanda quando quiser.',
  pending_close: 'Conta pedida. O garçom vai fechar a mesa.',
};

const GUEST_ERRORS: Record<string, string> = {
  orders_in_progress: 'Ainda há pedidos sendo preparados. Peça a conta quando todos estiverem prontos.',
  table_not_open: 'A mesa ainda não foi aberta pelo garçom.',
  invalid_table_state: 'A mesa mudou. Atualizamos a tela.',
  restaurant_closed: 'O restaurante está fechado agora, então a mesa não pode ser aberta.',
  fee_refusal_disabled: 'Este restaurante não permite retirar a taxa de serviço por aqui. Fale com o garçom.',
  product_unavailable: 'Um item da sacola esgotou. Remova-o e envie de novo.',
  invalid_product: 'Um item da sacola saiu do cardápio. Remova-o e envie de novo.',
  invalid_option: 'As opções de um item mudaram no cardápio. Remova-o da sacola e adicione de novo.',
  missing_required_option: 'Falta escolher uma opção obrigatória em um item. Remova-o da sacola e adicione de novo.',
  too_many_options: 'Um item tem mais escolhas do que o grupo permite. Remova-o da sacola e adicione de novo.',
  duplicate_option: 'Um item tem a mesma escolha repetida. Remova-o da sacola e adicione de novo.',
};

/** Most different lines one order takes (the API refuses more). */
const MAX_CART_LINES = 50;
const CART_FULL = `A sacola chegou ao limite de ${MAX_CART_LINES} itens diferentes. Envie esta comanda ou aumente a quantidade de um item que já está nela.`;

const LINE_PART: Record<string, string> = { notes: 'Observação de', quantity: 'Quantidade de', options: 'Opções de' };

/** An order the API refused field by field (`items.0.notes`), named after the bag line it is about. */
function orderProblem(e: ApiError, cart: CartLine[]): string | null {
  const [path, error] = Object.entries(e.fields)[0] ?? [];
  if (!path || !error) return null;
  if (path === 'items') return error.code === 'too_many' ? CART_FULL : error.code === 'too_few' ? 'A sacola está vazia. Adicione um item antes de enviar.' : null;
  const m = /^items\.(\d+)\.(\w+)/.exec(path);
  const line = m && cart[Number(m[1])];
  if (!m || !line) return null;
  return `${LINE_PART[m[2]] ?? 'Item'} ${line.product.name}: ${fieldMessage(error as FieldError)}`;
}

/** O servidor diz por que a sessão caiu; cada motivo tem sua mensagem. */
const phaseFor = (code: string): Phase =>
  code === 'session_taken_over' ? 'taken' : code === 'session_rejected' ? 'rejected' : code === 'session_expired' ? 'expired' : 'ended';

const ACTION = 'rounded-[18px] bg-white/95 px-5 py-3 text-sm font-bold text-leaf-700 shadow-sm transition active:scale-95 disabled:opacity-60';

export default function TableMenu({ params }: { params: { slug: string; token: string } }) {
  return (
    <AlertsProvider>
      <TableMenuView params={params} />
    </AlertsProvider>
  );
}

function TableMenuView({ params }: { params: { slug: string; token: string } }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [state, setState] = useState<SessionStateView | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picked, setPicked] = useState<ProductView | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [called, setCalled] = useState(false);
  /** Name of the waiter who took the call, shown for a few seconds. */
  const [coming, setComing] = useState<string | null>(null);
  const [view, setView] = useState<View>('menu');
  const [billVersion, setBillVersion] = useState(0);
  const [query, setQuery] = useState('');
  const cartKey = `elo.cart.${params.slug}.${params.token}`;
  const [cartLoaded, setCartLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await api<SessionStateView>('/api/public/session'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setPhase(phaseFor(e.code));
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

  const tableOpen = state?.table.state === 'open' || state?.table.state === 'pending_close';
  const guestPush = useGuestPush(params.token, tableOpen);
  // The "on the way" banner already covers an answered call while the page is in view.
  const quiet = useCallback((kind: string) => kind === 'call_answered' && document.visibilityState === 'visible', []);
  const alertOn = useGuestAlertHandlers(guestPush.state, quiet);

  // Sound needs one tap per page load; the first tap anywhere enables it.
  useEffect(() => {
    const unlock = () => unlockAlertSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useRealtime(
    {
      'table.updated': (p: unknown) => {
        void refresh();
        alertOn('table.updated')(p);
      },
      'order.created': refresh,
      'order.updated': (p: unknown) => {
        void refresh();
        alertOn('order.updated')(p);
      },
      'order.cancelled': refresh,
      'bill.updated': () => setBillVersion((v) => v + 1),
      'call.resolved': (p: { handledBy: { name: string | null } | null }) => {
        setCalled(false);
        setComing(p.handledBy?.name ?? 'O garçom');
        setTimeout(() => setComing(null), 8000);
        alertOn('call.resolved')(p);
      },
    },
    null,
    phase === 'ready',
    {
      onResync: () => {
        void refresh();
        setBillVersion((v) => v + 1);
      },
    },
  );

  // Garçom encerrou a mesa: a sessão cai e o estado volta a falhar com 401.
  useEffect(() => {
    if (state?.table.state === 'closed' && phase === 'ready') void refresh();
  }, [state?.table.state, phase, refresh]);

  // Opening hours and closures change on their own: fetch the status again right after the next change.
  const changesAt = state?.restaurant.availability.changesAt;
  useEffect(() => {
    if (!changesAt) return;
    const wait = new Date(changesAt).getTime() - Date.now() + 1000;
    if (wait > 2 ** 31 - 1) return;
    const timer = setTimeout(() => void refresh(), Math.max(wait, 1000));
    return () => clearTimeout(timer);
  }, [changesAt, refresh]);

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

  /** Runs a guest action; `explain` names a refusal only that action understands. */
  const act = async (fn: () => Promise<unknown>, explain?: (e: ApiError) => string | null) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      await refresh();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setPhase(phaseFor(e.code));
      else if (e instanceof ApiError && e.code === 'restaurant_closed') {
        setMessage(GUEST_ERRORS.restaurant_closed);
        void refresh();
      } else setMessage((e instanceof ApiError && (explain?.(e) ?? GUEST_ERRORS[e.code])) || unexpected(e));
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
  const reload = <Button onClick={() => location.reload()}>Recarregar a página</Button>;
  if (phase === 'taken')
    return (
      <Notice title="Mesa aberta em outro aparelho" icon={<Smartphone size={30} />} action={reload}>
        Outra pessoa abriu o link desta mesa depois de você, e este aparelho foi desconectado. Para pedir por aqui, recarregue a página. Se o outro aparelho já tiver aberto a mesa, chame o garçom.
      </Notice>
    );
  if (phase === 'rejected')
    return (
      <Notice title="Abertura não confirmada" icon={<DoorClosed size={30} />} action={reload}>
        O garçom não confirmou a abertura da mesa. Chame o garçom ou tente abrir de novo.
      </Notice>
    );
  if (phase === 'expired') return <Notice title="Sessão expirada" icon={<Timer size={30} />}>Escaneie o QR Code da mesa de novo para continuar.</Notice>;
  if (phase === 'ended') return <Notice title="Atendimento encerrado" icon={<Check size={30} />}>Obrigado pela visita! Para pedir de novo, escaneie o QR Code da mesa.</Notice>;
  if (phase === 'error' || !state) return <Notice title="Algo deu errado" icon={<WifiOff size={30} />}>Não foi possível carregar o cardápio. Tente de novo em instantes.</Notice>;

  const tableState = state.table.state;
  const availability = state.restaurant.availability;
  // A table already open keeps going; only a new one waits for the restaurant to open.
  const closedNow = tableState === 'closed' && !availability.open;
  // Once the bill is asked for, the menu is only for reading: nothing more can be ordered.
  const billRequested = tableState === 'pending_close';
  const pick = billRequested ? undefined : setPicked;
  const billReady = canRequestBill(state.orders.map((o) => o.status));
  const visible = filterMenu(state.menu, query);
  const total = cart.reduce((s, l) => s + lineUnit(l) * l.quantity, 0);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const activeOrders = state.orders.filter((o) => !['ready', 'cancelled', 'returned'].includes(o.status)).length;
  const showTabs = tableState !== 'closed' || state.orders.length > 0;

  const sendOrder = async () => {
    const ok = await act(
      () =>
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
      (e) => orderProblem(e, cart),
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
    closedNow ? (
      <span className="px-3 text-sm font-semibold opacity-90">Restaurante fechado</span>
    ) : tableState === 'closed' ? (
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
        {state.table.waiterName && (tableState === 'open' || tableState === 'pending_close') && (
          <span className="text-muted">Quem atende: {state.table.waiterName}</span>
        )}
      </MenuHeader>

      <RestaurantInfo profile={state.restaurant} />

      {message && !cartOpen && <p role="alert" className="mx-4 mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{message}</p>}
      {coming && (
        <p role="status" className="mx-4 mt-4 flex items-center gap-2 rounded-md bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <Check size={16} className="shrink-0" /> {coming} vai até a sua mesa.
        </p>
      )}

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
          {guestPush.invite}
          {billRequested && <p className="mx-4 mt-3 surface px-4 py-3 text-sm">Conta pedida: o cardápio fica só para consulta. Para pedir mais, chame o garçom.</p>}
          {!query && <Highlights menu={state.menu} onPick={pick} />}
          <CategoryTabs menu={visible} />
          <MenuList menu={visible} onPick={pick} searching={!!query} />
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
          {tableState === 'open' && (
            <>
              <Button className="w-full !py-3.5" disabled={busy || !billReady} onClick={() => act(() => api('/api/public/session/close', { body: {} }))}>Pedir a conta</Button>
              {!billReady && <p className="text-center text-sm text-muted">Você pode pedir a conta quando todos os pedidos estiverem prontos.</p>}
            </>
          )}
          {tableState === 'pending_close' && <p className="surface px-4 py-3 text-sm">Conta pedida. O garçom vai fechar a mesa.</p>}
        </BillPanel>
      )}

      <AnimatePresence>
        {view === 'menu' && cartCount > 0 && !billRequested && (
          <CartBar key="cart" count={cartCount} totalCents={total} onOpen={() => setCartOpen(true)} action={primary(ACTION)} />
        )}
      </AnimatePresence>

      <ProductSheet
        product={billRequested ? null : picked}
        blocked={cart.length >= MAX_CART_LINES ? CART_FULL : null}
        onClose={() => setPicked(null)}
        onAdd={(line) => { setCart((c) => (c.length >= MAX_CART_LINES ? c : [...c, line])); setPicked(null); }}
      />

      <Sheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Sua sacola"
        footer={
          <div className="space-y-3">
            {message && <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{message}</p>}
            <div className="flex items-baseline justify-between">
              <span className="text-muted">Total</span>
              <span className="font-display text-2xl font-extrabold tabular-nums">{formatBRL(total)}</span>
            </div>
            {tableState === 'open' && <Button className="w-full !py-3.5" loading={busy} onClick={sendOrder}>Enviar comanda</Button>}
            {tableState === 'closed' && !closedNow && <Button className="w-full !py-3.5" loading={busy} onClick={openTable}>Abrir mesa</Button>}
            {closedNow && (
              <p className="surface px-4 py-3 text-center text-sm">
                <strong className="block">{availability.label ?? 'Restaurante fechado'}</strong>
                {availability.pauseReason && <span className="block text-muted">{availability.pauseReason}</span>}
                <span className="block text-muted">Você pode ver o cardápio, mas a mesa só abre com o restaurante aberto.</span>
              </p>
            )}
            {tableState === 'pending_open' && <p className="surface px-4 py-3 text-center text-sm">Aguardando o garçom confirmar a mesa.</p>}
            {tableState === 'closed' && !closedNow && <p className="text-center text-xs text-muted">O garçom confirma a abertura antes de você enviar a comanda.</p>}
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
                <button aria-label={l.quantity === 1 ? `Remover ${l.product.name}` : 'Menos'} className="grid shrink-0 h-8 w-8 place-items-center rounded-pill hover:bg-brand/10" onClick={() => setCart((c) => (l.quantity === 1 ? c.filter((_, i) => i !== idx) : c.map((x, i) => (i === idx ? { ...x, quantity: x.quantity - 1 } : x))))}>
                  {l.quantity === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
                </button>
                <span className="w-6 text-center text-sm font-bold tabular-nums">{l.quantity}</span>
                <button aria-label="Mais" className="grid shrink-0 h-8 w-8 place-items-center rounded-pill hover:bg-brand/10" onClick={() => setCart((c) => c.map((x, i) => (i === idx ? { ...x, quantity: Math.min(50, x.quantity + 1) } : x)))}><Plus size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
