'use client';

import { ArrowLeft, Ban, CalendarClock, CircleCheck, Phone, UserRound, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { formatBRL, parseCents, type SubscriptionView } from '@elo/core';
import { Badge, Button, ColumnChart, DataTable, EmptyState, ErrorState, Field, GlassCard, Modal, PageHeader, SkeletonCards } from '@elo/ui';
import { Shell, useAdmin } from '../../_components/shell';

interface Detail {
  id: string;
  name: string;
  slug: string;
  managerName: string;
  managerContact: string;
  suspended: boolean;
  subscription: SubscriptionView;
}

interface Payment {
  id: string;
  amountCents: number;
  paidAt: string;
  newDueDate: string;
  note: string | null;
}

const STATE = { active: { label: 'Ativa', tone: 'success' }, grace: { label: 'Em tolerância', tone: 'warning' }, suspended: { label: 'Suspensa', tone: 'danger' } } as const;
const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR');
const EMPTY = { amount: '', paidAt: '', newDueDate: '', note: '' };

function View({ id }: { id: string }) {
  const { token, can } = useAdmin();
  const [r, setR] = useState<Detail | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setR(await api<Detail>(`/api/admin/restaurants/${id}`, { token }));
      if (can('subscriptions')) setPayments(await api<Payment[]>(`/api/admin/restaurants/${id}/payments`, { token }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [id, token, can]);

  useEffect(() => {
    void load();
  }, [load]);

  const guard = async (fn: () => Promise<unknown>) => {
    setError(null);
    setSaving(true);
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'Não foi possível concluir.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseCents(form.amount);
    if (cents === null) return setError('Informe o valor, por exemplo 99,90.');
    const ok = await guard(() =>
      api(`/api/admin/restaurants/${id}/payments`, {
        body: { amountCents: cents, paidAt: new Date(form.paidAt).toISOString(), newDueDate: new Date(form.newDueDate).toISOString(), note: form.note || undefined },
        token,
      }),
    );
    if (ok) {
      setForm(EMPTY);
      setOpen(false);
    }
  };

  if (failed) return <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar este restaurante.</ErrorState>;
  if (!r) return <SkeletonCards count={3} />;
  const st = STATE[r.subscription.state];
  const chart = [...payments].reverse().slice(-8).map((p) => ({ label: new Date(p.paidAt).toLocaleDateString('pt-BR', { month: 'short' }), value: p.amountCents / 100 }));

  return (
    <>
      <Link href="/restaurants" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"><ArrowLeft size={16} /> Restaurantes</Link>
      <PageHeader
        title={r.name}
        description={`Cardápio em /${r.slug}`}
        actions={
          <>
            {can('subscriptions') && <Button onClick={() => { setError(null); setOpen(true); }}><Wallet size={17} /> Registrar pagamento</Button>}
            {can('access_control') && (
              <Button variant={r.suspended ? 'soft' : 'danger'} loading={saving} onClick={() => guard(() => api(`/api/admin/restaurants/${id}/${r.suspended ? 'reactivate' : 'suspend'}`, { method: 'POST', body: {}, token }))}>
                {r.suspended ? <><CircleCheck size={17} /> Reativar acesso</> : <><Ban size={17} /> Suspender acesso</>}
              </Button>
            )}
          </>
        }
      />
      {error && !open && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard strong className="space-y-4 p-6">
          <Badge tone={st.tone} dot>{st.label}</Badge>
          <div className="flex items-center gap-3"><CalendarClock className="text-brand" size={20} /><div><div className="text-sm text-muted">Vencimento</div><div className="font-semibold">{fmt(r.subscription.dueDate)}</div></div></div>
          <div className="flex items-center gap-3"><UserRound className="text-brand" size={20} /><div><div className="text-sm text-muted">Gerente</div><div className="font-semibold">{r.managerName}</div></div></div>
          <div className="flex items-center gap-3"><Phone className="text-brand" size={20} /><div><div className="text-sm text-muted">Contato</div><div className="font-semibold">{r.managerContact}</div></div></div>
        </GlassCard>
        {can('subscriptions') && (
          <GlassCard className="p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Pagamentos recebidos</h2>
            {chart.length >= 2 ? <ColumnChart data={chart} format={(n) => formatBRL(n * 100)} /> : <p className="text-sm text-muted">O gráfico aparece a partir do segundo pagamento registrado.</p>}
          </GlassCard>
        )}
      </div>

      {can('subscriptions') && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-semibold">Histórico de pagamentos</h2>
          {payments.length === 0 ? (
            <EmptyState icon={Wallet} title="Nenhum pagamento registrado" action={<Button onClick={() => setOpen(true)}>Registrar pagamento</Button>}>Registre o primeiro pagamento para atualizar o vencimento.</EmptyState>
          ) : (
            <DataTable
              rows={payments}
              rowKey={(p) => p.id}
              columns={[
                { key: 'd', header: 'Pago em', cell: (p) => fmt(p.paidAt) },
                { key: 'v', header: 'Valor', cell: (p) => <span className="font-semibold tabular-nums">{formatBRL(p.amountCents)}</span> },
                { key: 'n', header: 'Observação', cell: (p) => <span className="text-muted">{p.note ?? '—'}</span> },
                { key: 'u', header: 'Novo vencimento', align: 'right', cell: (p) => fmt(p.newDueDate) },
              ]}
            />
          )}
        </section>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar pagamento" sheet>
        <form onSubmit={pay} className="space-y-4">
          <Field label="Valor"><input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="99,90" required autoFocus /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pago em"><input type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} required /></Field>
            <Field label="Novo vencimento"><input type="date" value={form.newDueDate} onChange={(e) => setForm({ ...form, newDueDate: e.target.value })} required /></Field>
          </div>
          <Field label="Observação"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit" loading={saving}>Registrar</Button></div>
        </form>
      </Modal>
    </>
  );
}

export default function RestaurantPage({ params }: { params: { id: string } }) {
  return (
    <Shell>
      <View id={params.id} />
    </Shell>
  );
}
