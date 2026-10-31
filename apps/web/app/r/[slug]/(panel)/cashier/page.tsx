'use client';

import { Minus, Percent, Plus, Receipt, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError, useRealtime } from '@elo/client';
import { type BillView, formatBRL, parseCents, splitBillByItems, splitBillEqually, splitEqually } from '@elo/core';
import { Badge, Button, EmptyState, ErrorState, Field, GlassCard, PageHeader, SkeletonCards } from '@elo/ui';
import { RequireRoles, useStaff } from '../../_components/shell';

const STATE_LABEL = { pending_open: 'Abrindo', open: 'Aberta', pending_close: 'Pediu a conta', closed: 'Fechada' } as const;
const STATE_TONE = { pending_open: 'info', open: 'success', pending_close: 'warning', closed: 'neutral' } as const;

function Cashier() {
  const { token } = useStaff();
  const [bills, setBills] = useState<BillView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBills(await api<BillView[]>('/api/bills', { token }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime({ 'bill.updated': load, 'table.updated': load }, token, true, { onResync: load });

  const current = bills?.find((b) => b.tableId === selected) ?? bills?.[0] ?? null;

  if (failed) return <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar as contas.</ErrorState>;
  if (!bills) return <SkeletonCards count={3} />;

  return (
    <>
      <PageHeader title="Caixa" description="O pagamento é feito no local." />
      {bills.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhuma conta em aberto">As contas das mesas com pedidos aparecem aqui.</EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <ul className="space-y-3">
            {bills.map((b) => (
              <li key={b.tableId}>
                <button
                  onClick={() => setSelected(b.tableId)}
                  aria-pressed={current?.tableId === b.tableId}
                  className="block w-full text-left"
                >
                  <GlassCard lift className={`p-4 ${current?.tableId === b.tableId ? 'ring-2 ring-brand' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <strong className="font-display text-xl">{b.tableName}</strong>
                      <Badge tone={STATE_TONE[b.state]} dot>{STATE_LABEL[b.state]}</Badge>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-sm text-muted">
                      <span>{b.lines.reduce((n, l) => n + l.quantity, 0)} itens</span>
                      <span className="font-display text-lg font-bold text-fg">{formatBRL(b.totalCents)}</span>
                    </div>
                  </GlassCard>
                </button>
              </li>
            ))}
          </ul>
          {current && <Detail key={current.tableId} bill={current} onChanged={load} />}
        </div>
      )}
    </>
  );
}

function Detail({ bill, onChanged }: { bill: BillView; onChanged: () => Promise<void> }) {
  const { token, impersonated } = useStaff();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adj, setAdj] = useState({ label: '', value: '', kind: 'discount' as 'discount' | 'extra' });

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await onChanged();
      return true;
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'no_active_session' ? 'A mesa não tem sessão ativa.' : 'Não foi possível salvar a alteração.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseCents(adj.value);
    if (!cents) return setError('Informe um valor maior que zero.');
    const ok = await run(() =>
      api(`/api/bills/${bill.tableId}/adjustments`, { body: { label: adj.label, cents: adj.kind === 'discount' ? -cents : cents }, token }),
    );
    if (ok) setAdj({ ...adj, label: '', value: '' });
  };

  const feeLabel = bill.feeWaivedBy === 'customer' ? 'Taxa recusada pelo cliente' : bill.feeWaivedBy === 'staff' ? 'Taxa removida' : `Taxa de serviço (${bill.serviceFeeBps / 100}%)`;

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">{bill.tableName}</h2>
          <Badge tone={STATE_TONE[bill.state]} dot>{STATE_LABEL[bill.state]}</Badge>
        </div>

        {bill.lines.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line/60 px-4 py-6 text-center text-sm text-muted">Nenhum pedido válido nesta conta ainda.</p>
        ) : (
          <ul className="divide-y divide-line/40">
            {bill.lines.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-4 py-2.5">
                <span>
                  <span className="font-semibold">{l.quantity}x</span> {l.name}
                  {l.details.length > 0 && <span className="block text-xs text-muted">{l.details.join(' · ')}</span>}
                </span>
                <span className="tabular-nums">{formatBRL(l.unitCents * l.quantity)}</span>
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-4 space-y-2 border-t border-line/40 pt-4 text-sm">
          <Row label="Subtotal" value={formatBRL(bill.subtotalCents)} />
          <Row label={feeLabel} value={formatBRL(bill.serviceFeeCents)} muted={bill.feeWaivedBy !== null} />
          {bill.adjustments.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted">
                {a.label}{a.reason && <span className="text-xs">({a.reason})</span>}
                {!impersonated && (
                  <button aria-label={`Remover ajuste ${a.label}`} disabled={busy} className="text-danger" onClick={() => run(() => api(`/api/bills/${bill.tableId}/adjustments/${i}`, { method: 'DELETE', token }))}>
                    <Trash2 size={14} />
                  </button>
                )}
              </dt>
              <dd className="tabular-nums">{a.cents < 0 ? '−' : '+'} {formatBRL(Math.abs(a.cents))}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-line/40 pt-3">
            <dt className="text-base font-semibold">Total</dt>
            <dd className="font-display text-3xl font-extrabold text-brand tabular-nums" aria-live="polite">{formatBRL(bill.totalCents)}</dd>
          </div>
        </dl>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {!impersonated && (
            <Button variant="soft" disabled={busy} onClick={() => run(() => api(`/api/bills/${bill.tableId}/fee`, { method: 'PUT', body: { waived: bill.feeWaivedBy === null }, token }))}>
              <Percent size={16} /> {bill.feeWaivedBy === null ? 'Remover taxa de serviço' : 'Cobrar taxa de serviço'}
            </Button>
          )}
          <Button variant="ghost" disabled={busy} onClick={() => run(async () => undefined)}>Recalcular</Button>
        </div>
      </GlassCard>

      {!impersonated && (
        <GlassCard className="p-6">
          <h3 className="mb-3 text-lg font-semibold">Ajuste na conta</h3>
          <form onSubmit={addAdjustment} className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem_auto] sm:items-end">
            <Field label="Descrição"><input value={adj.label} onChange={(e) => setAdj({ ...adj, label: e.target.value })} placeholder="Ex.: cortesia da casa" required minLength={2} /></Field>
            <Field label="Valor"><input value={adj.value} onChange={(e) => setAdj({ ...adj, value: e.target.value })} placeholder="5,00" inputMode="decimal" required /></Field>
            <Field label="Tipo">
              <select value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value as 'discount' | 'extra' })}>
                <option value="discount">Desconto</option>
                <option value="extra">Acréscimo</option>
              </select>
            </Field>
            <Button type="submit" disabled={busy}>Aplicar</Button>
          </form>
        </GlassCard>
      )}

      {bill.lines.length > 0 && <Split bill={bill} />}
    </div>
  );
}

const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-muted">{label}</dt>
    <dd className={`tabular-nums ${muted ? 'text-muted line-through' : ''}`}>{value}</dd>
  </div>
);

/** Divisão da conta: igual entre N pessoas ou por item (cada linha dividida entre quem consumiu). */
function Split({ bill }: { bill: BillView }) {
  const [mode, setMode] = useState<'equal' | 'items'>('equal');
  const [people, setPeople] = useState(2);
  const [shared, setShared] = useState<Record<number, number[]>>({});

  const parts = useMemo(() => {
    if (mode === 'equal') return splitBillEqually(bill, people);
    const consumed = Array.from({ length: people }, () => 0);
    bill.lines.forEach((l, i) => {
      const who = (shared[i] ?? Array.from({ length: people }, (_, p) => p)).filter((p) => p < people);
      const group = who.length ? who : Array.from({ length: people }, (_, p) => p);
      splitEqually(l.unitCents * l.quantity, group.length).forEach((c, k) => (consumed[group[k]] += c));
    });
    return splitBillByItems(bill, consumed);
  }, [bill, mode, people, shared]);

  const toggle = (line: number, person: number) =>
    setShared((s) => {
      const base = s[line] ?? Array.from({ length: people }, (_, p) => p);
      const next = base.includes(person) ? base.filter((p) => p !== person) : [...base, person];
      return { ...s, [line]: next.length ? next : base };
    });

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><Users size={19} className="text-brand" /> Dividir a conta</h3>
        <div role="tablist" className="flex gap-1 rounded-pill bg-leaf-100/50 p-1 text-sm">
          {([['equal', 'Por pessoa'], ['items', 'Por item']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`rounded-pill px-4 py-1.5 transition ${mode === k ? 'bg-brand text-brand-fg shadow' : 'text-muted'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <span className="text-muted">Pessoas</span>
        <Button variant="ghost" aria-label="Menos uma pessoa" onClick={() => setPeople((n) => Math.max(2, n - 1))}><Minus size={15} /></Button>
        <strong className="w-6 text-center text-lg tabular-nums">{people}</strong>
        <Button variant="ghost" aria-label="Mais uma pessoa" onClick={() => setPeople((n) => Math.min(12, n + 1))}><Plus size={15} /></Button>
      </div>

      {mode === 'items' && (
        <ul className="mb-4 space-y-2 text-sm">
          {bill.lines.map((l, i) => {
            const who = shared[i] ?? Array.from({ length: people }, (_, p) => p);
            return (
              <li key={i} className="rounded-md bg-leaf-100/40 px-3 py-2.5">
                <div className="flex justify-between gap-3"><span>{l.quantity}x {l.name}</span><span className="tabular-nums">{formatBRL(l.unitCents * l.quantity)}</span></div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Array.from({ length: people }, (_, p) => (
                    <button key={p} aria-pressed={who.includes(p)} onClick={() => toggle(i, p)} className={`rounded-pill px-3 py-1 text-xs transition ${who.includes(p) ? 'bg-brand text-brand-fg' : 'bg-white/40 text-muted'}`}>Pessoa {p + 1}</button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {parts.map((c, p) => (
          <li key={p} className="flex items-center justify-between rounded-md bg-leaf-100/40 px-4 py-2.5">
            <span className="text-muted">Pessoa {p + 1}</span>
            <strong className="tabular-nums">{formatBRL(c)}</strong>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Taxa e ajustes são divididos na proporção do consumo. A soma das partes é sempre igual ao total.</p>
    </GlassCard>
  );
}

export default function CashierPage() {
  return (
    <RequireRoles roles={['cashier', 'waiter', 'restaurant_admin', 'manager']}>
      <Cashier />
    </RequireRoles>
  );
}
