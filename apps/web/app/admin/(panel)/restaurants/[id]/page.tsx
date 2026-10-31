'use client';

import { Ban, CalendarClock, Crown, CalendarCog, CircleCheck, ExternalLink, Layers, Mail, MessageCircle, Pencil, Phone, RefreshCw, Table2, Trash2, UserRound, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, storeToken } from '@elo/client';
import { cycleLabel, formatBRL, type Role, type SubscriptionView } from '@elo/core';
import { Badge, Button, ColumnChart, ConfirmModal, DataTable, EmptyState, ErrorState, Field, GlassCard, Modal, PageHeader, SkeletonCards } from '@elo/ui';
import { useBilling } from './_components/billing';
import { ActivityList } from '../../../../_components/activity-list';
import { useAdmin } from '../../../_components/shell';

interface Detail {
  id: string;
  name: string;
  slug: string;
  managerName: string;
  managerContact: string;
  suspended: boolean;
  subscription: SubscriptionView;
}

interface TeamMember {
  id: string;
  name: string;
  username: string;
  roles: Role[];
  active: boolean;
}

interface AdminTables {
  slug: string;
  tables: { id: string; name: string; state: string; token: string; url: string }[];
}

const STATE = { active: { label: 'Ativa', tone: 'success' }, grace: { label: 'Em tolerância', tone: 'warning' }, suspended: { label: 'Suspensa', tone: 'danger' } } as const;
const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR');
/**
 * Ready-made billing message on the manager's own channel: WhatsApp for a phone, e-mail otherwise.
 * Sending stays manual; there is no integration.
 */
function billingLink(r: Detail): { href: string; label: string; Icon: typeof MessageCircle } | null {
  const overdue = new Date(r.subscription.dueDate).getTime() < Date.now();
  const text = overdue
    ? `Olá, ${r.managerName}! Aqui é da Elo Digital. A mensalidade do Elo Cardápio de ${r.name} venceu em ${fmt(r.subscription.dueDate)}. Pode nos confirmar o pagamento? Obrigado!`
    : `Olá, ${r.managerName}! Aqui é da Elo Digital. O acesso de ${r.name} ao painel do Elo Cardápio está suspenso. Podemos conversar para regularizar? Obrigado!`;
  const contact = r.managerContact.trim();
  if (contact.includes('@')) {
    return { href: `mailto:${contact}?subject=${encodeURIComponent(`Elo Cardápio · ${r.name}`)}&body=${encodeURIComponent(text)}`, label: 'Cobrar por e-mail', Icon: Mail };
  }
  const digits = contact.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const phone = digits.length <= 11 ? `55${digits}` : digits;
  return { href: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`, label: 'Cobrar pelo WhatsApp', Icon: MessageCircle };
}

const ERRORS: Record<string, string> = {
  not_suspended: 'Suspenda o acesso antes de excluir.',
  slug_mismatch: 'O link digitado não confere.',
  restaurant_deleted: 'Este restaurante foi excluído.',
  invalid_owner: 'Escolha alguém ativo da equipe.',
};

function View({ id }: { id: string }) {
  const router = useRouter();
  const { token, can } = useAdmin();
  const [r, setR] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tables, setTables] = useState<AdminTables | null>(null);
  const [rotating, setRotating] = useState<AdminTables['tables'][number] | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ name: string; managerName: string; managerContact: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState('');
  const [access, setAccess] = useState<'suspend' | 'reactivate' | null>(null);
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [newOwner, setNewOwner] = useState<{ userId: string; reason: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setR(await api<Detail>(`/api/admin/restaurants/${id}`, { token }));
      setTeam(await api<TeamMember[]>(`/api/admin/restaurants/${id}/staff`, { token }));
      if (can('restaurants.tables')) setTables(await api<AdminTables>(`/api/admin/restaurants/${id}/tables`, { token }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [id, token, can]);

  useEffect(() => {
    void load();
  }, [load]);

  const billing = useBilling({ id, token, subscription: r?.subscription ?? null, canRecord: can('payments.record'), onChange: load });

  const guard = async (fn: () => Promise<unknown>) => {
    setError(null);
    setSaving(true);
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? ERRORS[e.code] ?? 'Não foi possível concluir. Confira os campos.' : 'Não foi possível concluir.');
      return false;
    } finally {
      setSaving(false);
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

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing && (await guard(() => api(`/api/admin/restaurants/${id}`, { method: 'PATCH', body: editing, token })))) setEditing(null);
  };

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await guard(() => api(`/api/admin/restaurants/${id}`, { method: 'DELETE', body: { confirmSlug }, token }));
    if (ok) router.replace('/admin/restaurants?status=deleted');
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
  const charge = can('payments.record') && r.subscription.state !== 'active' ? billingLink(r) : null;
  const sub = r.subscription;
  const overdue = sub.reasons.includes('overdue');
  const overdueDays = Math.floor((Date.now() - new Date(sub.dueDate).getTime()) / 86_400_000);
  const owner = team?.find((m) => m.roles.includes('restaurant_admin')) ?? null;
  const candidates = (team ?? []).filter((m) => m.active && m.id !== owner?.id);
  const paid = billing.entries.filter((p) => p.kind === 'payment' && !p.voidedAt);
  const chart = [...paid].reverse().slice(-8).map((p) => ({ label: new Date(p.paidAt).toLocaleDateString('pt-BR', { month: 'short' }), value: p.amountCents / 100 }));

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Restaurantes', href: '/admin/restaurants' }, { label: r.name }]}
        title={r.name}
        description={
          <a href={`/${r.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline">
            Cardápio em /{r.slug} <ExternalLink size={14} />
          </a>
        }
        actions={
          <>
            {can('restaurants.edit') && (
              <Button variant="ghost" onClick={() => { setError(null); setEditing({ name: r.name, managerName: r.managerName, managerContact: r.managerContact }); }}><Pencil size={16} /> Editar</Button>
            )}
            {can('restaurants.access') && (
              <Button variant="soft" loading={saving} onClick={openPanel}><ExternalLink size={17} /> Abrir painel</Button>
            )}
            {can('payments.record') && sub.plan && <Button onClick={() => billing.open('pay')}><Wallet size={17} /> Registrar pagamento</Button>}
            {can('restaurants.suspend') && (
              <Button variant={r.suspended ? 'soft' : 'danger'} onClick={() => { setError(null); setAccess(r.suspended ? 'reactivate' : 'suspend'); }}>
                {r.suspended ? <><CircleCheck size={17} /> Reativar acesso</> : <><Ban size={17} /> Suspender acesso</>}
              </Button>
            )}
          </>
        }
      />
      {error && !editing && !deleting && !access && !newOwner && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard strong className="flex flex-col gap-4 p-6">
          <div className="space-y-2">
            <Badge tone={st.tone} dot>{st.label}</Badge>
            {sub.reasons.length > 0 && (
              <ul className="space-y-1 text-sm">
                {sub.reasons.includes('manual') && <li>Suspenso manualmente pela Elo Digital.</li>}
                {overdue && <li>Vencida há {overdueDays} {overdueDays === 1 ? 'dia' : 'dias'}: registre um pagamento ou ajuste o vencimento para liberar.</li>}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Layers className="text-brand" size={20} />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-muted">Plano</div>
              <div className="font-semibold">{sub.plan ? `${sub.plan.name} · ${formatBRL(sub.plan.priceCents)} ${cycleLabel(sub.plan.cycleMonths)}` : 'Sem plano'}</div>
            </div>
            {can('payments.record') && <Button variant="ghost" onClick={() => billing.open('plan')}>Trocar</Button>}
          </div>
          <div className="flex items-center gap-3">
            <CalendarClock className="text-brand" size={20} />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-muted">Vencimento</div>
              <div className="font-semibold">{fmt(sub.dueDate)}</div>
            </div>
            {can('payments.record') && <Button variant="ghost" onClick={() => billing.open('adjust')} aria-label="Ajustar vencimento"><CalendarCog size={16} /> Ajustar</Button>}
          </div>
          <div className="flex items-center gap-3">
            <Crown className="text-brand" size={20} />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-muted">Titular do painel</div>
              <div className="font-semibold">{owner ? `${owner.name} (${owner.username})` : 'Sem titular'}</div>
            </div>
            {can('restaurants.owner') && candidates.length > 0 && (
              <Button variant="ghost" onClick={() => { setError(null); setNewOwner({ userId: candidates[0].id, reason: '' }); }}>Trocar</Button>
            )}
          </div>
          <div className="flex items-center gap-3"><UserRound className="text-brand" size={20} /><div><div className="text-sm text-muted">Responsável pelo contrato</div><div className="font-semibold">{r.managerName}</div></div></div>
          <div className="flex items-center gap-3"><Phone className="text-brand" size={20} /><div><div className="text-sm text-muted">Contato</div><div className="font-semibold">{r.managerContact}</div></div></div>
          {charge && (
            <div className="mt-auto border-t border-line/40 pt-4">
              <a href={charge.href} target="_blank" rel="noreferrer" className="btn-glass flex w-full items-center justify-center gap-2 rounded-pill px-4 py-2.5 text-sm font-semibold">
                <charge.Icon size={16} /> {charge.label}
              </a>
            </div>
          )}
        </GlassCard>
        {can('payments.view') && (
          <GlassCard className="p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Pagamentos recebidos</h2>
            {chart.length >= 2 ? <ColumnChart data={chart} format={(n) => formatBRL(n * 100)} /> : <p className="text-sm text-muted">O gráfico aparece a partir do segundo pagamento registrado.</p>}
          </GlassCard>
        )}
      </div>

      {can('payments.view') && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-semibold">Histórico de pagamentos</h2>
          {billing.history}
        </section>
      )}

      {can('restaurants.tables') && tables && (
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

      {can('restaurants.activity') && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Registros</h2>
          <ActivityList endpoint={`/api/admin/restaurants/${id}/activity`} token={token} />
        </section>
      )}

      {can('restaurants.delete') && (
        <section className="mt-8 rounded-lg border border-danger/40 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-danger"><Trash2 size={18} /> Excluir restaurante</h2>
          <p className="mt-1 text-sm text-muted">O cardápio sai do ar e a equipe perde o acesso. Os dados ficam guardados para restauração ou exportação e depois são apagados de vez.</p>
          {r.subscription.state !== 'suspended' && <p className="mt-2 text-sm font-medium text-warning">Para excluir, suspenda o acesso primeiro.</p>}
          <Button className="mt-3" variant="danger" disabled={r.subscription.state !== 'suspended'} onClick={() => { setError(null); setConfirmSlug(''); setDeleting(true); }}>Excluir restaurante</Button>
        </section>
      )}

      <ConfirmModal
        open={!!access}
        title={access === 'suspend' ? `Suspender ${r.name}?` : `Reativar ${r.name}?`}
        confirmLabel={access === 'suspend' ? 'Suspender acesso' : 'Reativar acesso'}
        danger={access === 'suspend'}
        loading={saving}
        error={error}
        onConfirm={async () => {
          if (await guard(() => api(`/api/admin/restaurants/${id}/${access}`, { method: 'POST', body: {}, token }))) setAccess(null);
        }}
        onClose={() => setAccess(null)}
      >
        {access === 'suspend' ? (
          <p>A equipe do restaurante perde o acesso ao painel na hora, inclusive quem está com ele aberto. O cardápio dos clientes continua no ar.</p>
        ) : (
          overdue ? (
            <p>Isso tira só a suspensão manual. A assinatura está <strong>vencida há {overdueDays} dias</strong>, então a equipe continua bloqueada até você registrar um pagamento ou ajustar o vencimento.</p>
          ) : (
            <p>A equipe volta a entrar no painel na hora.</p>
          )
        )}
      </ConfirmModal>

      <ConfirmModal
        open={!!newOwner}
        title="Trocar o titular"
        confirmLabel="Trocar titular"
        danger
        loading={saving}
        disabled={!newOwner || newOwner.reason.trim().length < 3}
        error={error}
        onConfirm={async () => {
          if (newOwner && (await guard(() => api(`/api/admin/restaurants/${id}/owner`, { body: newOwner, token })))) setNewOwner(null);
        }}
        onClose={() => setNewOwner(null)}
      >
        <p>Use quando o titular saiu ou perdeu o acesso. A pessoa escolhida passa a administrar o restaurante e {owner ? `${owner.name} vira Gerente` : 'o restaurante volta a ter titular'}.</p>
        {newOwner && (
          <>
            <Field label="Novo titular">
              <select value={newOwner.userId} onChange={(e) => setNewOwner({ ...newOwner, userId: e.target.value })}>
                {candidates.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.username})</option>)}
              </select>
            </Field>
            <Field label="Motivo" hint="Pelo menos 3 caracteres. Fica nos registros do restaurante.">
              <textarea value={newOwner.reason} onChange={(e) => setNewOwner({ ...newOwner, reason: e.target.value })} minLength={3} maxLength={300} rows={3} required />
            </Field>
          </>
        )}
      </ConfirmModal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar restaurante" sheet>
        {editing && (
          <form onSubmit={saveEdit} className="space-y-4">
            <Field label="Nome do restaurante"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} minLength={2} maxLength={120} required autoFocus /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Responsável pelo contrato"><input value={editing.managerName} onChange={(e) => setEditing({ ...editing, managerName: e.target.value })} minLength={2} maxLength={120} required /></Field>
              <Field label="Contato do responsável"><input value={editing.managerContact} onChange={(e) => setEditing({ ...editing, managerContact: e.target.value })} minLength={5} maxLength={120} required /></Field>
            </div>
            <p className="text-xs text-muted">O link /{r.slug} não muda: ele está impresso nos QR Codes.</p>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end"><Button type="submit" loading={saving}>Salvar</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={deleting} onClose={() => setDeleting(false)} title={`Excluir ${r.name}?`} sheet>
        <form onSubmit={remove} className="space-y-4">
          <p className="text-sm">Para confirmar, digite o link do restaurante: <strong className="font-mono">{r.slug}</strong></p>
          <input value={confirmSlug} onChange={(e) => setConfirmSlug(e.target.value)} autoCapitalize="none" autoComplete="off" spellCheck={false} aria-label="Link do restaurante" autoFocus />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleting(false)}>Voltar</Button>
            <Button type="submit" variant="danger" loading={saving} disabled={confirmSlug.trim() !== r.slug}>Excluir</Button>
          </div>
        </form>
      </Modal>

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

      {billing.modals}
    </>
  );
}

export default function RestaurantPage({ params }: { params: { id: string } }) {
  return <View id={params.id} />;
}
