'use client';

import type { ProductView } from '@elo/core/api/views/catalog.view';
import type { SessionStateView } from '@elo/core/api/views/table.view';
import type { FieldError } from '@elo/core/fields/field-rules';
import type { AlertItem } from '@elo/ui/components/feedback/alerts';
import type { CartLine } from '../product-sheet';
import { api } from '@elo/client/http/api-client';
import { ApiError } from '@elo/client/http/api-error';
import { HTTP_STATUS } from '@elo/client/http/http-status';
import { useRealtime } from '@elo/client/realtime/use-realtime';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { summarizeOptions } from '@elo/core/catalog/option-summary';
import { formatBRL } from '@elo/core/money/cents';
import { ORDER_IN_PROGRESS, canRequestBill } from '@elo/core/orders/order-status';
import { unlockAlertSound, useAlerts } from '@elo/ui/components/feedback/alerts';
import { Button } from '@elo/ui/components/forms/button';
import { AnimatePresence } from '@elo/ui/components/motion/motion';
import { Sheet } from '@elo/ui/components/overlays/sheet';
import {
    BellRing,
    Check,
    DoorClosed,
    Minus,
    Plus,
    Smartphone,
    Timer,
    Trash2
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FEEDBACK_MS,
    MAX_TIMEOUT_MS,
    STATUS_CHANGE_MARGIN_MS
} from '#/_lib/constants/timing';
import { bpsToPercent } from '#/_lib/format';
import { cartKey } from '#/_lib/guest-storage';
import { GUEST_ERRORS } from '#/_lib/messages/errors';
import { fieldMessage } from '#/_lib/messages/fields';
import { CLOSED_FALLBACK, availabilityText } from '#/_lib/messages/opening-hours';
import { ORDER_LINE_PARTS } from '#/_lib/messages/orders';
import { GUEST_ACTION_ALERTS, SESSION_NOTICES } from '#/_lib/messages/tables';
import { unexpected } from '#/_lib/use-form';
import { BillPanel } from '../bill-panel';
import { MenuFooter } from '../menu-chrome';
import { CategoryTabs, Highlights, MenuList, MenuSearch, filterMenu } from '../menu-list';
import { CartBar } from '../menu/cart-bar';
import { GoogleReviewCard, GoogleReviewRow } from '../menu/google-review-card';
import { useGuestAlertHandlers, useGuestPush } from '../menu/guest-alerts';
import { MenuHeader } from '../menu/header';
import { RestaurantInfo } from '../menu/info';
import { ReviewForm } from '../menu/review-form';
import { Notice } from '../notice';
import { OrderTracker } from '../order-tracker';
import { PizzaSheet } from '../pizza-sheet';
import { ProductSheet, lineUnit, pizzaAddons } from '../product-sheet';
import { TableStatusBar } from './table-status-bar';

type Phase = 'ready' | 'taken' | 'rejected' | 'expired' | 'ended';
type View = 'menu' | 'orders' | 'bill';

/** Most different lines one order takes (the API refuses more). */
const MAX_CART_LINES = 50;
const CART_FULL = `A sacola chegou ao limite de ${MAX_CART_LINES} itens diferentes. Envie esta comanda ou aumente a quantidade de um item que já está nela.`;

/** An order the API refused field by field (`items.0.notes`), named after the bag line it is about. */
function orderProblem(e: ApiError, cart: CartLine[]): string | null {
    const [path, error] = Object.entries(e.fields)[0] ?? [];
    if (!path || !error) return null;
    if (path === 'items')
        return error.code === 'too_many'
            ? CART_FULL
            : error.code === 'too_few'
              ? 'A sacola está vazia. Adicione um item antes de enviar.'
              : null;
    const m = /^items\.(\d+)\.(\w+)/.exec(path);
    const line = m && cart[Number(m[1])];
    if (!m || !line) return null;
    return `${ORDER_LINE_PARTS[m[2]] ?? 'Item'} ${line.product.name}: ${fieldMessage(error as FieldError)}`;
}

/** The server says why the session dropped; each reason has its own message. */
const phaseFor = (code: ApiErrorCode): Phase =>
    code === ApiErrorCode.SESSION_TAKEN_OVER
        ? 'taken'
        : code === ApiErrorCode.SESSION_REJECTED
          ? 'rejected'
          : code === ApiErrorCode.SESSION_EXPIRED
            ? 'expired'
            : 'ended';

/** While the guest waits on the team, the screen also checks over HTTP at this pace, in case an event never arrives. */
const WAITING_POLL_MS = 30_000;
/** A short drop is not worth a banner. */
const LINK_NOTICE_AFTER_MS = 3000;

const ACTION =
    'rounded-[18px] bg-white/95 px-5 py-3 text-sm font-bold text-leaf-700 shadow-sm transition active:scale-95 disabled:opacity-60';

/**
 * The guest's table, from a session already started. The table link (token) never reaches
 * this view: after the start the cookie alone carries the session. Needs `AlertsProvider`.
 */
export function TableMenuView({ initial }: { initial: SessionStateView }) {
    const [phase, setPhase] = useState<Phase>('ready');
    const [state, setState] = useState<SessionStateView>(initial);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [reviewed, setReviewed] = useState(false);
    const [picked, setPicked] = useState<ProductView | null>(null);
    const [cartOpen, setCartOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [called, setCalled] = useState(false);
    const [view, setView] = useState<View>('menu');
    const [billVersion, setBillVersion] = useState(0);
    const [query, setQuery] = useState('');
    const cartStorageKey = cartKey(initial.restaurant.slug);
    const [cartLoaded, setCartLoaded] = useState(false);

    /** Number of the latest state request: an older answer arriving late never overwrites a newer one. */
    const latest = useRef(0);
    const refresh = useCallback(async () => {
        const call = ++latest.current;
        try {
            const next = await api<SessionStateView>('/api/public/session');
            if (call === latest.current) setState(next);
        } catch (e) {
            if (e instanceof ApiError && e.status === HTTP_STATUS.UNAUTHORIZED)
                setPhase(phaseFor(e.code));
        }
    }, []);

    const tableOpen =
        state?.table.state === 'open' || state?.table.state === 'pending_close';
    const guestPush = useGuestPush(initial.restaurant.slug, tableOpen);
    const alertOn = useGuestAlertHandlers(guestPush.state);
    const { notify } = useAlerts();
    /** Confirms what the guest just did; silent, since they tapped it themselves. */
    const done = (alert: Omit<AlertItem, 'tone'>) =>
        notify({ ...alert, tone: 'success' }, { silent: true });

    // Sound needs one tap per page load; the first tap anywhere enables it.
    useEffect(() => {
        const unlock = () => unlockAlertSound();
        window.addEventListener('pointerdown', unlock, { once: true });
        return () => window.removeEventListener('pointerdown', unlock);
    }, []);

    const link = useRealtime(
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
            'call.resolved': (p: unknown) => {
                setCalled(false);
                alertOn('call.resolved')(p);
            }
        },
        null,
        phase === 'ready',
        {
            ticket: state?.realtimeTicket,
            onResync: () => {
                void refresh();
                setBillVersion((v) => v + 1);
            }
        }
    );

    const [linkDown, setLinkDown] = useState(false);
    useEffect(() => {
        if (link === 'connected') return setLinkDown(false);
        const timer = setTimeout(() => setLinkDown(true), LINK_NOTICE_AFTER_MS);
        return () => clearTimeout(timer);
    }, [link]);

    // Waiting on the waiter or the kitchen: a slow HTTP check backs up the live feed.
    const waiting =
        state?.table.state === 'pending_open' ||
        state?.table.state === 'pending_close' ||
        !!state?.orders.some((o) => ORDER_IN_PROGRESS.includes(o.status));
    useEffect(() => {
        if (!waiting || phase !== 'ready') return;
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') void refresh();
        }, WAITING_POLL_MS);
        return () => clearInterval(timer);
    }, [waiting, phase, refresh]);

    // The waiter closed the table: the session drops and the state fails again with 401.
    useEffect(() => {
        if (state?.table.state === 'closed' && phase === 'ready') void refresh();
    }, [state?.table.state, phase, refresh]);

    // Opening hours and closures change on their own: fetch the status again right after the next change.
    const changesAt = state?.restaurant.availability.changesAt;
    useEffect(() => {
        if (!changesAt) return;
        const wait = new Date(changesAt).getTime() - Date.now() + STATUS_CHANGE_MARGIN_MS;
        if (wait > MAX_TIMEOUT_MS) return;
        const timer = setTimeout(
            () => void refresh(),
            Math.max(wait, STATUS_CHANGE_MARGIN_MS)
        );
        return () => clearTimeout(timer);
    }, [changesAt, refresh]);

    // Bill requested: takes the guest to the Bill tab, where the service review is.
    const tableStateNow = state?.table.state;
    useEffect(() => {
        if (tableStateNow === 'pending_close') setView('bill');
    }, [tableStateNow]);

    // Cart saved on the device: survives a page reload.
    useEffect(() => {
        if (cartLoaded) return;
        try {
            const saved = JSON.parse(localStorage.getItem(cartStorageKey) ?? '[]') as {
                productId: string;
                quantity: number;
                notes: string;
                options: CartLine['options'];
                pizza?: CartLine['pizza'];
            }[];
            const products = new Map(
                state.menu.flatMap((c) => c.products).map((p) => [p.id, p])
            );
            setCart(
                saved.flatMap((l) =>
                    products.has(l.productId)
                        ? [
                              {
                                  product: products.get(l.productId)!,
                                  quantity: l.quantity,
                                  notes: l.notes,
                                  options: l.options,
                                  pizza: l.pizza
                              }
                          ]
                        : []
                )
            );
        } catch {
            /* unreadable saved cart: start empty */
        }
        setCartLoaded(true);
    }, [state, cartLoaded, cartStorageKey]);

    useEffect(() => {
        if (!cartLoaded) return;
        try {
            localStorage.setItem(
                cartStorageKey,
                JSON.stringify(
                    cart.map((l) => ({
                        productId: l.product.id,
                        quantity: l.quantity,
                        notes: l.notes,
                        options: l.options,
                        pizza: l.pizza
                    }))
                )
            );
        } catch {
            /* storage unavailable */
        }
    }, [cart, cartLoaded, cartStorageKey]);

    // The session is over: its bag goes with it.
    useEffect(() => {
        if (phase === 'ready') return;
        try {
            localStorage.removeItem(cartStorageKey);
        } catch {
            /* storage unavailable */
        }
    }, [phase, cartStorageKey]);

    /** A refusal shows next to the bag's button while it is open, and as a pop-up anywhere else. */
    const report = (text: string) => {
        if (cartOpen) return setMessage(text);
        notify(
            { title: GUEST_ACTION_ALERTS.failed, body: text, tone: 'danger' },
            { silent: true }
        );
    };

    /** Runs a guest action; `explain` names a refusal only that action understands. */
    const act = async (
        fn: () => Promise<unknown>,
        explain?: (e: ApiError) => string | null
    ) => {
        setBusy(true);
        setMessage(null);
        try {
            await fn();
            await refresh();
            return true;
        } catch (e) {
            if (e instanceof ApiError && e.status === HTTP_STATUS.UNAUTHORIZED)
                setPhase(phaseFor(e.code));
            else if (e instanceof ApiError && e.code === ApiErrorCode.RESTAURANT_CLOSED) {
                report(GUEST_ERRORS[ApiErrorCode.RESTAURANT_CLOSED] ?? unexpected(e));
                void refresh();
            } else
                report(
                    (e instanceof ApiError && (explain?.(e) ?? GUEST_ERRORS[e.code])) ||
                        unexpected(e)
                );
            return false;
        } finally {
            setBusy(false);
        }
    };

    if (phase === 'taken')
        return (
            <Notice title={SESSION_NOTICES.taken.title} icon={<Smartphone size={30} />}>
                {SESSION_NOTICES.taken.text}
            </Notice>
        );
    if (phase === 'rejected')
        return (
            <Notice
                title={SESSION_NOTICES.rejected.title}
                icon={<DoorClosed size={30} />}
            >
                {SESSION_NOTICES.rejected.text}
            </Notice>
        );
    if (phase === 'expired')
        return (
            <Notice title={SESSION_NOTICES.expired.title} icon={<Timer size={30} />}>
                {SESSION_NOTICES.expired.text}
            </Notice>
        );
    if (phase === 'ended')
        return (
            <Notice
                title={SESSION_NOTICES.ended.title}
                icon={<Check size={30} />}
                action={
                    <GoogleReviewCard
                        url={state.restaurant.googleReviewUrl}
                        slug={state.restaurant.slug}
                        name={state.restaurant.name}
                        thanks
                    />
                }
            >
                {SESSION_NOTICES.ended.text}
            </Notice>
        );

    const tableState = state.table.state;
    const availability = state.restaurant.availability;
    // A table already open keeps going; only a new one waits for the restaurant to open.
    const closedNow = tableState === 'closed' && !availability.open;
    // Once the bill is asked for, the menu is only for reading: nothing more can be ordered.
    const billRequested = tableState === 'pending_close';
    const pick = billRequested ? undefined : setPicked;
    const pickedCategory = picked
        ? (state.menu.find((c) => c.id === picked.categoryId) ?? null)
        : null;
    const addLine = (line: CartLine) => {
        setCart((c) => (c.length >= MAX_CART_LINES ? c : [...c, line]));
        setPicked(null);
    };
    const billReady = canRequestBill(state.orders.map((o) => o.status));
    const visible = filterMenu(state.menu, query);
    const total = cart.reduce((s, l) => s + lineUnit(l, state.menu) * l.quantity, 0);
    const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
    const activeOrders = state.orders.filter(
        (o) => !['ready', 'cancelled', 'returned'].includes(o.status)
    ).length;
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
                            // A pizza sends its size and flavors apart; its options are the add-ons.
                            options: l.pizza
                                ? pizzaAddons(l)
                                : l.options.map((o) => ({
                                      group: o.group,
                                      label: o.label
                                  })),
                            pizza: l.pizza
                        }))
                    }
                }),
            (e) => orderProblem(e, cart)
        );
        if (ok) {
            setCart([]);
            setCartOpen(false);
            setView('orders');
            done(GUEST_ACTION_ALERTS.orderSent);
        }
    };

    const openTable = async () => {
        if (await act(() => api('/api/public/session/open', { body: {} }))) {
            setCartOpen(false);
            done(GUEST_ACTION_ALERTS.openRequested);
        }
    };

    const callWaiter = async () => {
        if (
            await act(() => api('/api/public/session/call', { method: 'POST', body: {} }))
        ) {
            setCalled(true);
            setTimeout(() => setCalled(false), FEEDBACK_MS.called);
            done(GUEST_ACTION_ALERTS.waiterCalled);
        }
    };

    // One main action per table state.
    const primary = (className: string) =>
        closedNow ? (
            <span className="px-3 text-sm font-semibold opacity-90">
                Restaurante fechado
            </span>
        ) : tableState === 'closed' ? (
            <button className={className} disabled={busy} onClick={openTable}>
                Abrir mesa
            </button>
        ) : tableState === 'open' ? (
            <button className={className} disabled={busy} onClick={sendOrder}>
                Enviar comanda
            </button>
        ) : tableState === 'pending_open' ? (
            <span className="px-3 text-sm font-semibold opacity-90">
                Aguardando o garçom
            </span>
        ) : null;

    return (
        <div className="mx-auto min-h-dvh max-w-2xl pb-28">
            <MenuHeader
                name={state.restaurant.name}
                coverUrl={state.restaurant.coverUrl}
                logoUrl={state.restaurant.logoUrl}
                action={
                    <button
                        onClick={callWaiter}
                        disabled={busy || tableState === 'closed'}
                        aria-label="Chamar garçom"
                        className="glass flex h-10 items-center gap-2 !rounded-pill px-3.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50"
                    >
                        {called ? (
                            <Check size={18} className="text-success" />
                        ) : (
                            <BellRing size={18} />
                        )}
                        <span className="hidden sm:inline">
                            {called ? 'Garçom avisado' : 'Chamar garçom'}
                        </span>
                    </button>
                }
            >
                <span className="rounded-pill bg-brand px-3 py-1 text-xs font-bold text-brand-fg">
                    {state.table.name}
                </span>
            </MenuHeader>

            <TableStatusBar
                state={tableState}
                restaurantClosed={closedNow}
                waiterName={state.table.waiterName}
                link={linkDown ? (link === 'offline' ? 'offline' : 'reconnecting') : null}
            />

            <RestaurantInfo profile={state.restaurant} />

            {showTabs && (
                <div className="px-4 pt-4">
                    <div
                        className="surface flex !rounded-pill p-1 text-sm font-semibold"
                        role="tablist"
                    >
                        {(
                            [
                                ['menu', 'Cardápio', 0],
                                ['orders', 'Pedidos', activeOrders],
                                ['bill', 'Conta', 0]
                            ] as const
                        ).map(([key, label, n]) => (
                            <button
                                key={key}
                                role="tab"
                                aria-selected={view === key}
                                onClick={() => setView(key)}
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-pill px-3 py-2.5 transition ${view === key ? 'bg-brand text-brand-fg shadow-sm' : 'text-muted hover:text-fg'}`}
                            >
                                {label}
                                {n > 0 && (
                                    <span className="grid min-w-5 place-items-center rounded-pill bg-accent px-1 text-xs font-bold text-accent-fg">
                                        {n}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {view === 'menu' && (
                <>
                    <div className="px-4 pb-1 pt-4">
                        <MenuSearch value={query} onChange={setQuery} />
                    </div>
                    {guestPush.invite}
                    {billRequested && (
                        <p className="mx-4 mt-3 surface px-4 py-3 text-sm">
                            Conta pedida: o cardápio fica só para consulta. Para pedir
                            mais, chame o garçom.
                        </p>
                    )}
                    {!query && <Highlights menu={state.menu} onPick={pick} />}
                    <CategoryTabs menu={visible} />
                    <MenuList menu={visible} onPick={pick} searching={!!query} />
                    <div className="px-4 pt-6">
                        <MenuFooter name={state.restaurant.name} />
                    </div>
                </>
            )}

            {view === 'orders' && (
                <div className="space-y-3 px-4 pt-5">
                    {state.orders.length === 0 && (
                        <p className="surface px-4 py-8 text-center text-sm text-muted">
                            Nenhum pedido enviado ainda.
                        </p>
                    )}
                    {state.orders.map((o) => (
                        <OrderTracker
                            key={o.id}
                            order={o}
                            onCancel={async () => {
                                if (
                                    await act(() =>
                                        api(`/api/public/session/orders/${o.id}/cancel`, {
                                            body: {}
                                        })
                                    )
                                )
                                    done(GUEST_ACTION_ALERTS.orderCancelled);
                            }}
                        />
                    ))}
                </div>
            )}

            {view === 'bill' && (
                <BillPanel active version={billVersion}>
                    {tableState === 'open' && (
                        <>
                            <Button
                                className="w-full !py-3.5"
                                disabled={busy || !billReady}
                                onClick={async () => {
                                    if (
                                        await act(() =>
                                            api('/api/public/session/close', { body: {} })
                                        )
                                    )
                                        done(GUEST_ACTION_ALERTS.billRequested);
                                }}
                            >
                                Pedir a conta
                            </Button>
                            {!billReady && (
                                <p className="text-center text-sm text-muted">
                                    Você pode pedir a conta quando todos os pedidos
                                    estiverem prontos.
                                </p>
                            )}
                        </>
                    )}
                    {tableState === 'pending_close' && (
                        <p className="surface px-4 py-3 text-sm">
                            Conta pedida. O garçom vai fechar a mesa.
                        </p>
                    )}
                    {(tableState === 'open' || tableState === 'pending_close') && (
                        <ReviewForm
                            onSent={setReviewed}
                            footer={
                                <GoogleReviewRow
                                    url={state.restaurant.googleReviewUrl}
                                    slug={state.restaurant.slug}
                                    thanks={reviewed}
                                />
                            }
                        />
                    )}
                </BillPanel>
            )}

            <AnimatePresence>
                {view === 'menu' && cartCount > 0 && !billRequested && (
                    <CartBar
                        key="cart"
                        count={cartCount}
                        totalCents={total}
                        onOpen={() => setCartOpen(true)}
                        action={primary(ACTION)}
                    />
                )}
            </AnimatePresence>

            {pickedCategory?.pizza ? (
                <PizzaSheet
                    product={billRequested ? null : picked}
                    category={pickedCategory}
                    blocked={cart.length >= MAX_CART_LINES ? CART_FULL : null}
                    onClose={() => setPicked(null)}
                    onAdd={addLine}
                />
            ) : (
                <ProductSheet
                    product={billRequested ? null : picked}
                    blocked={cart.length >= MAX_CART_LINES ? CART_FULL : null}
                    onClose={() => setPicked(null)}
                    onAdd={addLine}
                />
            )}

            <Sheet
                open={cartOpen}
                onClose={() => setCartOpen(false)}
                title="Sua sacola"
                footer={
                    <div className="space-y-3">
                        {message && (
                            <p
                                role="alert"
                                className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger"
                            >
                                {message}
                            </p>
                        )}
                        <div className="flex items-baseline justify-between">
                            <span className="text-muted">Total</span>
                            <span className="font-display text-2xl font-extrabold tabular-nums">
                                {formatBRL(total)}
                            </span>
                        </div>
                        {tableState === 'open' && (
                            <Button
                                className="w-full !py-3.5"
                                loading={busy}
                                onClick={sendOrder}
                            >
                                Enviar comanda
                            </Button>
                        )}
                        {tableState === 'closed' && !closedNow && (
                            <Button
                                className="w-full !py-3.5"
                                loading={busy}
                                onClick={openTable}
                            >
                                Abrir mesa
                            </Button>
                        )}
                        {closedNow && (
                            <p className="surface px-4 py-3 text-center text-sm">
                                <strong className="block">
                                    {availabilityText(availability) ?? CLOSED_FALLBACK}
                                </strong>
                                {availability.pauseReason && (
                                    <span className="block text-muted">
                                        {availability.pauseReason}
                                    </span>
                                )}
                                <span className="block text-muted">
                                    Você pode ver o cardápio, mas a mesa só abre com o
                                    restaurante aberto.
                                </span>
                            </p>
                        )}
                        {tableState === 'pending_open' && (
                            <p className="surface px-4 py-3 text-center text-sm">
                                Aguardando o garçom confirmar a mesa.
                            </p>
                        )}
                        {tableState === 'closed' && !closedNow && (
                            <p className="text-center text-xs text-muted">
                                O garçom confirma a abertura antes de você enviar a
                                comanda.
                            </p>
                        )}
                        {state.restaurant.serviceFeeBps > 0 && (
                            <p className="text-center text-xs text-muted">
                                Taxa de serviço de{' '}
                                {bpsToPercent(
                                    state.restaurant.serviceFeeBps
                                ).toLocaleString('pt-BR')}
                                % na conta.
                                {state.restaurant.guestFeeRefusal
                                    ? ' Você pode recusá-la na aba Conta.'
                                    : ''}
                            </p>
                        )}
                    </div>
                }
            >
                {cart.length === 0 && (
                    <p className="mt-4 text-sm text-muted">Sua sacola está vazia.</p>
                )}
                <ul className="mt-4 divide-y divide-line/40">
                    {cart.map((l, idx) => (
                        <li key={idx} className="flex items-start gap-3 py-3">
                            <div className="min-w-0 flex-1 text-sm">
                                <div className="font-semibold">
                                    {l.pizza
                                        ? (state.menu.find(
                                              (c) => c.id === l.product.categoryId
                                          )?.name ?? l.product.name)
                                        : l.product.name}
                                </div>
                                {l.options.length > 0 && (
                                    <div className="text-muted">
                                        {summarizeOptions(l.options)
                                            .map((o) => o.text)
                                            .join(' · ')}
                                    </div>
                                )}
                                {l.notes && (
                                    <div className="text-muted">Obs.: {l.notes}</div>
                                )}
                                <div className="mt-1 font-semibold tabular-nums text-brand">
                                    {formatBRL(lineUnit(l, state.menu) * l.quantity)}
                                </div>
                            </div>
                            <div className="surface flex items-center !rounded-pill p-0.5">
                                <button
                                    aria-label={
                                        l.quantity === 1
                                            ? `Remover ${l.product.name}`
                                            : 'Menos'
                                    }
                                    className="grid shrink-0 h-8 w-8 place-items-center rounded-pill hover:bg-brand/10"
                                    onClick={() =>
                                        setCart((c) =>
                                            l.quantity === 1
                                                ? c.filter((_, i) => i !== idx)
                                                : c.map((x, i) =>
                                                      i === idx
                                                          ? {
                                                                ...x,
                                                                quantity: x.quantity - 1
                                                            }
                                                          : x
                                                  )
                                        )
                                    }
                                >
                                    {l.quantity === 1 ? (
                                        <Trash2 size={15} />
                                    ) : (
                                        <Minus size={15} />
                                    )}
                                </button>
                                <span className="w-6 text-center text-sm font-bold tabular-nums">
                                    {l.quantity}
                                </span>
                                <button
                                    aria-label="Mais"
                                    className="grid shrink-0 h-8 w-8 place-items-center rounded-pill hover:bg-brand/10"
                                    onClick={() =>
                                        setCart((c) =>
                                            c.map((x, i) =>
                                                i === idx
                                                    ? {
                                                          ...x,
                                                          quantity: Math.min(
                                                              50,
                                                              x.quantity + 1
                                                          )
                                                      }
                                                    : x
                                            )
                                        )
                                    }
                                >
                                    <Plus size={15} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </Sheet>
        </div>
    );
}
