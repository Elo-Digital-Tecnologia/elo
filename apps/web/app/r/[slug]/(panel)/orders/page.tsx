'use client';

import type { OrderHistoryItem, OrderHistoryPage } from '@elo/core/api/views/order.view';
import type { TableView } from '@elo/core/api/views/table.view';
import type { OrderStatus } from '@elo/core/orders/order-status';
import { api } from '@elo/client/http/api-client';
import { dayError } from '@elo/core/fields/field-rules';
import { formatBRL } from '@elo/core/money/cents';
import { ORDER_HISTORY_FLOOR_DAYS } from '@elo/core/orders/order-status';
import { Badge } from '@elo/ui/components/feedback/badge';
import {
    EmptyState,
    ErrorState,
    SkeletonCards
} from '@elo/ui/components/feedback/states';
import { Button } from '@elo/ui/components/forms/button';
import { DateInput } from '@elo/ui/components/forms/date-fields';
import { GlassCard } from '@elo/ui/components/layout/glass-card';
import { Field, PageHeader } from '@elo/ui/components/layout/section';
import { Pagination } from '@elo/ui/components/navigation/pagination';
import { ChevronDown, ClipboardList } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ORDER_HISTORY_STATUS_TEXTS } from '#/_lib/messages/orders';
import { RequireRoles, useStaff } from '../../_components/shell';

const STATUS: Record<
    OrderStatus,
    { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }
> = {
    sent: { label: ORDER_HISTORY_STATUS_TEXTS.sent.label, tone: 'info' },
    received: { label: ORDER_HISTORY_STATUS_TEXTS.received.label, tone: 'info' },
    preparing: { label: ORDER_HISTORY_STATUS_TEXTS.preparing.label, tone: 'warning' },
    ready: { label: ORDER_HISTORY_STATUS_TEXTS.ready.label, tone: 'success' },
    cancelled: { label: ORDER_HISTORY_STATUS_TEXTS.cancelled.label, tone: 'danger' },
    returned: { label: ORDER_HISTORY_STATUS_TEXTS.returned.label, tone: 'neutral' }
};

const ymd = (d: Date) => d.toLocaleDateString('sv-SE');
const when = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

function OrderRow({ order }: { order: OrderHistoryItem }) {
    const [open, setOpen] = useState(false);
    const st = STATUS[order.status];
    const off = order.status === 'cancelled' || order.status === 'returned';
    const count = order.items.reduce((n, i) => n + i.quantity, 0);
    return (
        <li>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="flex w-full flex-col gap-2 p-4 text-left transition hover:bg-brand/5 sm:flex-row sm:items-center sm:gap-4"
            >
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <strong>{order.tableName ?? 'Mesa'}</strong>
                        <Badge tone={st.tone} dot>
                            {st.label}
                        </Badge>
                        {!order.closedAt && <Badge tone="brand">Mesa aberta</Badge>}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted">
                        {when(order.createdAt)} · {count} {count === 1 ? 'item' : 'itens'}
                        {order.servedBy ? ` · atendida por ${order.servedBy}` : ''}
                    </span>
                </span>
                <span className="flex items-center justify-between gap-3 sm:justify-end">
                    <span
                        className={`font-display text-lg font-bold tabular-nums ${off ? 'text-muted line-through' : ''}`}
                    >
                        {formatBRL(order.totalCents)}
                    </span>
                    <ChevronDown
                        size={18}
                        className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </span>
            </button>
            {open && (
                <div className="space-y-2 border-t border-line/30 px-4 pb-4 pt-3 text-sm">
                    <ul className="space-y-1.5">
                        {order.items.map((i, k) => (
                            <li key={k} className="flex justify-between gap-3">
                                <span className="min-w-0">
                                    <span className="font-medium">
                                        {i.quantity}× {i.name}
                                    </span>
                                    {i.options.length > 0 && (
                                        <span className="block text-xs text-muted">
                                            {i.options.map((o) => o.label).join(', ')}
                                        </span>
                                    )}
                                    {i.notes && (
                                        <span className="block text-xs text-muted">
                                            Obs.: {i.notes}
                                        </span>
                                    )}
                                </span>
                                <span className="shrink-0 tabular-nums">
                                    {formatBRL(i.unitCents * i.quantity)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {order.cancelReason && (
                        <p className="text-danger">Motivo: {order.cancelReason}</p>
                    )}
                    {order.closedAt && (
                        <p className="text-muted">
                            Mesa fechada em {when(order.closedAt)}.
                        </p>
                    )}
                </div>
            )}
        </li>
    );
}

function History() {
    const { token, roles } = useStaff();
    const full = roles.includes('restaurant_admin') || roles.includes('manager');
    const [range, setRange] = useState({
        from: ymd(new Date(Date.now() - 6 * 86_400_000)),
        to: ymd(new Date())
    });
    const [status, setStatus] = useState<OrderStatus | ''>('');
    const [tableId, setTableId] = useState('');
    const [tables, setTables] = useState<TableView[]>([]);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<OrderHistoryPage | null>(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api<TableView[]>('/api/tables', { token })
            .then(setTables)
            .catch(() => setTables([]));
    }, [token]);

    const load = useCallback(async () => {
        setBusy(true);
        try {
            const qs = new URLSearchParams({ page: String(page) });
            if (full) {
                qs.set('from', range.from);
                qs.set('to', range.to);
            }
            if (status) qs.set('status', status);
            if (tableId) qs.set('tableId', tableId);
            setData(await api<OrderHistoryPage>(`/api/orders/history?${qs}`, { token }));
            setFailed(false);
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    }, [token, page, full, range, status, tableId]);
    useEffect(() => {
        void load();
    }, [load]);

    const filter =
        <T,>(set: (v: T) => void) =>
        (v: T) => {
            setPage(1);
            set(v);
        };

    return (
        <>
            <PageHeader
                title="Pedidos"
                description={
                    full
                        ? 'Todos os pedidos do restaurante, do mais recente para o mais antigo. Toque num pedido para ver os itens.'
                        : `Pedidos dos últimos ${ORDER_HISTORY_FLOOR_DAYS} dias, para o turno e para dúvidas de clientes. O histórico completo fica com o titular e os gerentes.`
                }
            />
            <GlassCard className="mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                {full && (
                    <>
                        <Field label="De">
                            <DateInput
                                value={range.from}
                                max={range.to}
                                onChange={filter(
                                    (v: string) =>
                                        !dayError(v) &&
                                        setRange((r) => ({ ...r, from: v }))
                                )}
                                required
                            />
                        </Field>
                        <Field label="Até">
                            <DateInput
                                value={range.to}
                                min={range.from}
                                max={ymd(new Date())}
                                onChange={filter(
                                    (v: string) =>
                                        !dayError(v) && setRange((r) => ({ ...r, to: v }))
                                )}
                                required
                            />
                        </Field>
                    </>
                )}
                <Field label="Situação">
                    <select
                        value={status}
                        onChange={(e) =>
                            filter(setStatus)(e.target.value as OrderStatus | '')
                        }
                    >
                        <option value="">Todas</option>
                        {(Object.keys(STATUS) as OrderStatus[]).map((s) => (
                            <option key={s} value={s}>
                                {STATUS[s].label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Mesa">
                    <select
                        value={tableId}
                        onChange={(e) => filter(setTableId)(e.target.value)}
                    >
                        <option value="">Todas</option>
                        {tables.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </Field>
            </GlassCard>

            {failed && (
                <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>
                    Não foi possível carregar os pedidos.
                </ErrorState>
            )}
            {!data && !failed && <SkeletonCards count={3} />}
            {data && data.total === 0 && (
                <EmptyState icon={ClipboardList} title="Nenhum pedido">
                    Nenhum pedido encontrado com esses filtros.
                </EmptyState>
            )}
            {data && data.total > 0 && (
                <>
                    <GlassCard
                        className={`transition-opacity ${busy ? 'opacity-50' : ''}`}
                    >
                        <ul className="divide-y divide-line/30">
                            {data.items.map((o) => (
                                <OrderRow key={o.id} order={o} />
                            ))}
                        </ul>
                    </GlassCard>
                    <Pagination
                        className="mt-4"
                        page={data.page}
                        pageSize={data.pageSize}
                        total={data.total}
                        onPage={setPage}
                    />
                </>
            )}
        </>
    );
}

export default function OrdersPage() {
    return (
        <RequireRoles
            roles={['restaurant_admin', 'manager', 'waiter', 'cashier', 'kitchen']}
        >
            <History />
        </RequireRoles>
    );
}
