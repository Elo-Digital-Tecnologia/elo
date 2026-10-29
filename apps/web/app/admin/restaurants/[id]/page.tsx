'use client';

import { Ban, CalendarClock, CircleCheck, ExternalLink, MessageCircle, Phone, RefreshCw, Table2, UserRound, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, storeToken } from '@elo/client';
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

interface AdminTables {
  slug: string;
  tables: { id: string; name: string; state: string; token: string; url: string }[];
}

interface Payment {
  id: string;
  amountCents: number;
  paidAt: string;
  newDueDate: string;
  note: string | null;
  recordedByName: string | null;
}

const STATE = { active: { label: 'Ativa', tone: 'success' }, grace: { label: 'Em tolerância', tone: 'warning' }, suspended: { label: 'Suspensa', tone: 'danger' } } as const;
const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR');
/** Texto de cobrança pronto para o WhatsApp. O envio é manual: não há integração. */
function billingLink(r: Detail): string | null {
  const digits = r.managerContact.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const phone = digits.length <= 11 ? `55${digits}` : digits;
  const due = new Date(r.subscription.dueDate).toLocaleDateString('pt-BR');
  const text = `Olá, ${r.managerName}! Aqui é da Elo Digital. A mensalidade do Elo Cardápio de ${r.name} venceu em ${due}. Pode nos confirmar o pagamento? Obrigado!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

const EMPTY = { amount: '', paidAt: '', newDueDate: '', note: '' };

function View({ id }: { id: string }) {
  const router = useRouter();
  const { token, can } = useAdmin();
  const [r, setR] = useState<Detail | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tables, setTables] = useState<AdminTables | null>(null);
  const [rotating, setRotating] = useState<AdminTables['tables'][number] | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setR(await api<Detail>(`/api/admin/restaurants/${id}`, { token }));
      if (can('subscriptions')) setPayments(await api<Payment[]>(`/api/admin/restaurants/${id}/payments`, { token }));
      if (can('table_tokens')) setTables(await api<AdminTables>(`/api/admin/restaurants/${id}/tables`, { token }));
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

  const rotate = async () => {
    if (!rotating) return;
    const ok = await guard(async () => {
      const t = await api<{ token: string }>(`/api/admin/restaurants/${id}/tables/${rotating.id}/rotate-token`, { method: 'POST', body: {}, token });
      setNewLink(`${rotating.url.slice(0, rotating.url.lastIndexOf('/') + 1)}${t.token}`);
    });
    if (ok) setRotating(null);
  };

  if (failed) return <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar este restaurante.</ErrorState>;
  if (!r) return <SkeletonCards count={3} />;
  const openPanel = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await api<{ accessToken: string; slug: string }>(`/api/admin/restaurants/${id}/access`, { method: 'POST', body: {}, token });
      storeToken(res.slug, res.accessToken);
      router.push(`/r/${res.slug}/dashboard`);
    } catch {
      setError('Não foi possível abrir o painel deste restaurante.');
      setSaving(false);
    }
  };

  const st = STATE[r.subscription.state];
  const chart = [...payments].reverse().slice(-8).map((p) => ({ label: new Date(p.paidAt).toLocaleDateString('pt-BR', { month: 'short' }), value: p.amountCents / 100 }));

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Restaurantes', href: '/admin/restaurants' }, { label: r.name }]}
        title={r.name}
        description={`Cardápio em /${r.slug}`}
        actions={
          <>
            {can('restaurant_access') && (
              <Button variant="soft" loading={saving} onClick={openPanel}><ExternalLink size={17} /> Abrir painel</Button>
            )}
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
          {can('subscriptions') && billingLink(r) && r.subscription.state !== 'active' && (
            <a href={billingLink(r)!} target="_blank" rel="noreferrer" className="btn-glass inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold"><MessageCircle size={16} /> Cobrar pelo WhatsApp</a>
          )}
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
                { key: 'r', header: 'Registrado por', cell: (p) => <span className="text-muted">{p.recordedByName ?? '—'}</span> },
                { key: 'u', header: 'Novo vencimento', align: 'right', cell: (p) => fmt(p.newDueDate) },
              ]}
            />
          )}
        </section>
      )}

      {can('table_tokens') && tables && (
        <section className="mt-6">
          <h2 className="mb-1 text-xl font-semibold">Mesas e tokens</h2>
          <p className="mb-3 text-sm text-muted">Regravar um token invalida o QR Code e a tag atuais da mesa e encerra a sessão em andamento. Use só se suspeitar de abuso.</p>
          {tables.tables.length === 0 ? (
            <EmptyState icon={Table2} title="Nenhuma mesa cadastrada">As mesas são criadas pelo restaurante.</EmptyState>
          ) : (
            <DataTable
              rows={tables.tables}
              rowKey={(t) => t.id}
              columns={[
                { key: 'n', header: 'Mesa', cell: (t) => <span className="font-semibold">{t.name}</span> },
                { key: 's', header: 'Estado', cell: (t) => <Badge tone={t.state === 'closed' ? 'neutral' : 'success'} dot>{t.state === 'closed' ? 'Fechada' : 'Em uso'}</Badge> },
                { key: 'a', header: '', align: 'right', cell: (t) => <Button variant="ghost" onClick={() => { setError(null); setRotating(t); }}><RefreshCw size={15} /> Regravar token</Button> },
              ]}
            />
          )}
        </section>
      )}

      <Modal open={!!rotating} onClose={() => setRotating(null)} title="Regravar token da mesa" sheet>
        <p className="text-sm">A mesa <strong>{rotating?.name}</strong> passará a ter um novo link. O QR Code impresso e a tag NFC atuais deixam de funcionar e a sessão aberta é encerrada.</p>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRotating(null)}>Voltar</Button>
          <Button variant="danger" loading={saving} onClick={rotate}>Regravar token</Button>
        </div>
      </Modal>

      <Modal open={!!newLink} onClose={() => setNewLink(null)} title="Novo link da mesa" sheet>
        <p className="mb-2 text-sm text-muted">Grave este link na tag NFC e gere o novo QR Code. Ele só aparece agora.</p>
        <input readOnly value={newLink ?? ''} onFocus={(e) => e.currentTarget.select()} />
        <div className="mt-4 flex justify-end"><Button onClick={() => setNewLink(null)}>Pronto</Button></div>
      </Modal>

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
