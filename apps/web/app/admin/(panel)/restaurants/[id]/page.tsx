'use client';

import { Ban, CalendarClock, CircleCheck, Crown, ExternalLink, FilePlus2, FileSignature, History, Hourglass, KeyRound, Layers, LayoutGrid, Mail, MessageCircle, Pencil, Phone, RefreshCw, Table2, Trash2, UserRound, Wallet } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { api, ApiError, storeToken } from '@elo/client';
import { billingProblem, CONTRACT_KIND_LABEL, CONTRACT_LIMITS, type ContractView, cycleLabel, FIELD_RULES, formatBRL, RESTAURANT_STATUS_LABEL, type Role, type SubscriptionView } from '@elo/core';
import { Badge, Button, ConfirmModal, DataTable, EmptyState, ErrorState, Field, GlassCard, Input, Modal, PageHeader, Select, SkeletonCards, type TabItem, TabPanel, Tabs, Textarea } from '@elo/ui';
import { useBilling } from './_components/billing';
import { useContracts } from './_components/contracts';
import { PaymentSummaryCard } from './_components/payment-summary';
import { ActivityList } from '../../../../_components/activity-list';
import { dayBR, plural, STATUS_TONE } from '../../../../_lib/restaurant-status';
import { rule, unexpected, useForm } from '../../../../_lib/use-form';
import { useAdmin } from '../../../_components/shell';

interface Detail {
  id: string;
  name: string;
  slug: string;
  managerName: string;
  managerContact: string;
  suspended: boolean;
  createdAt: string;
  initialDueDate: string;
  /** The plan last signed (or suggested at sign-up), offered first in a new contract. */
  planId: string | null;
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

const EDIT_CHECKS = {
  name: rule(FIELD_RULES.restaurantName),
  managerName: rule(FIELD_RULES.personName),
  managerContact: rule(FIELD_RULES.contact),
};

const OWNER_CHECKS = { reason: rule(FIELD_RULES.reason) };
const SLUG_CHECKS = { slug: rule(FIELD_RULES.slug), reason: rule(FIELD_RULES.reason) };
const SLUG_MESSAGES = {
  slug_taken: 'Este endereço já é (ou já foi) de outro restaurante.',
  slug_reserved: 'Este endereço é reservado pelo sistema. Escolha outro.',
};

type Tab = 'general' | 'contracts' | 'payments' | 'tables' | 'activity';

function View({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (params.get('tab') ?? 'general') as Tab;
  const setTab = (next: Tab) => router.replace(next === 'general' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  const { token, can } = useAdmin();
  const [r, setR] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tables, setTables] = useState<AdminTables | null>(null);
  const [rotating, setRotating] = useState<AdminTables['tables'][number] | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [changingSlug, setChangingSlug] = useState(false);
  const slugForm = useForm({ slug: '', reason: '' }, SLUG_CHECKS, SLUG_MESSAGES);
  const editForm = useForm({ name: '', managerName: '', managerContact: '' }, EDIT_CHECKS);
  const [deleting, setDeleting] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState('');
  const [access, setAccess] = useState<'suspend' | 'reactivate' | null>(null);
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [newOwner, setNewOwner] = useState(false);
  const ownerForm = useForm({ userId: '', reason: '' }, OWNER_CHECKS);

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
  const contracts = useContracts({
    id,
    token,
    canManage: can('contracts.manage'),
    canEndTrial: can('payments.record'),
    signatory: { name: r?.managerName ?? '', contact: r?.managerContact ?? '' },
    trial: r?.subscription.trial ?? null,
    planId: r?.subscription.plan?.id ?? r?.planId ?? null,
    onChange: load,
  });

  /** Runs an action and reloads; `fields` puts the API's per-field errors under their fields first. */
  const guard = async (fn: () => Promise<unknown>, fields?: (e: unknown) => boolean) => {
    setError(null);
    setSaving(true);
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      if (!fields?.(e)) setError((e instanceof ApiError && ERRORS[e.code]) || unexpected(e));
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
    setError(null);
    if (!editForm.validate()) return;
    if (await guard(() => api(`/api/admin/restaurants/${id}`, { method: 'PATCH', body: editForm.values, token }), editForm.fromServer)) setEditing(false);
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

  const charge = can('payments.record') && (r.subscription.status === 'grace' || r.subscription.status === 'suspended') ? billingLink(r) : null;
  const sub = r.subscription;
  const overdue = sub.reasons.includes('overdue');
  const overdueDays = Math.floor((Date.now() - new Date(sub.dueDate).getTime()) / 86_400_000);
  const billingOn = sub.contract.state !== 'pending';
  // After the last contract ended, a payment only settles days it covered (or comes ahead of a renewal).
  const nothingOwed = billingProblem(sub.contract, sub.dueDate.slice(0, 10)) === 'nothing_owed';
  const owner = team?.find((m) => m.roles.includes('restaurant_admin')) ?? null;
  const candidates = (team ?? []).filter((m) => m.active && m.id !== owner?.id);
  // Manual suspension only takes away an access the team still has.
  const canSuspend = can('restaurants.suspend') && !r.suspended && (sub.status === 'active' || sub.status === 'grace');
  const canReactivate = can('restaurants.suspend') && r.suspended;
  const tabs: TabItem<Tab>[] = [
    { id: 'general', label: 'Geral', icon: LayoutGrid },
    { id: 'contracts', label: 'Contratos', icon: FileSignature },
    ...(can('payments.view') ? [{ id: 'payments' as const, label: 'Pagamentos', icon: Wallet }] : []),
    ...(can('restaurants.tables') && tables ? [{ id: 'tables' as const, label: 'Mesas', icon: Table2 }] : []),
    ...(can('restaurants.activity') ? [{ id: 'activity' as const, label: 'Registros', icon: History }] : []),
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : 'general';

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
              <Button variant="ghost" onClick={() => { setError(null); editForm.reset({ name: r.name, managerName: r.managerName, managerContact: r.managerContact }); setEditing(true); }}><Pencil size={16} /> Editar</Button>
            )}
            {can('restaurants.access') && (
              <Button variant="soft" loading={saving} onClick={openPanel}><ExternalLink size={17} /> Abrir painel</Button>
            )}
            {can('payments.record') && sub.plan && billingOn && (
              <Button
                disabled={nothingOwed}
                title={nothingOwed ? 'O contrato terminou e não há nada em aberto: registre a renovação para receber de novo.' : undefined}
                onClick={() => billing.open('pay')}
              >
                <Wallet size={17} /> Registrar pagamento
              </Button>
            )}
            {canSuspend && <Button variant="danger" onClick={() => { setError(null); setAccess('suspend'); }}><Ban size={17} /> Suspender acesso</Button>}
            {canReactivate && <Button variant="soft" onClick={() => { setError(null); setAccess('reactivate'); }}><CircleCheck size={17} /> Reativar acesso</Button>}
          </>
        }
      />
      {error && !editing && !deleting && !access && !newOwner && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}

      <Tabs items={tabs} value={current} onChange={setTab} label="Seções do restaurante" />

      {current === 'general' && (
        <TabPanel id="general">
          <StatusPanel
            sub={sub}
            contract={contracts.current}
            overdueDays={overdueDays}
            onPlan={can('payments.record') && billingOn ? () => billing.open('plan') : null}
            onAdjust={can('payments.record') && billingOn ? () => billing.open('adjust') : null}
            action={
              sub.status === 'pending' && can('contracts.manage') && contracts.loaded && !contracts.latest ? (
                <Button onClick={() => contracts.open('initial')}><FilePlus2 size={16} /> Registrar contrato</Button>
              ) : sub.status === 'ended' && can('contracts.manage') && contracts.latest ? (
                <Button onClick={() => contracts.open('renewal')}><RefreshCw size={16} /> Renovar contrato</Button>
              ) : null
            }
            charge={charge}
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {contracts.card}
            <GlassCard className="flex flex-col gap-4 p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Crown size={20} className="text-brand" /> Titular</h2>
              <div className="flex items-center gap-3">
                <UserRound className="text-brand" size={20} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-muted">Nome</div>
                  <div className="font-semibold [overflow-wrap:anywhere]">{r.managerName}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="text-brand" size={20} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-muted">Contato</div>
                  <div className="font-semibold [overflow-wrap:anywhere]">{r.managerContact}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <KeyRound className="text-brand" size={20} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-muted">Conta no painel</div>
                  <div className="font-semibold [overflow-wrap:anywhere]">{owner ? `${owner.name} (${owner.username})` : 'Sem conta de titular'}</div>
                </div>
                {can('restaurants.owner') && candidates.length > 0 && (
                  <Button variant="ghost" onClick={() => { setError(null); ownerForm.reset({ userId: candidates[0].id, reason: '' }); setNewOwner(true); }}>Trocar</Button>
                )}
              </div>
            </GlassCard>
          </div>

          {can('restaurants.delete') && (
            <section className="mt-8 rounded-lg border border-danger/40 p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-danger"><Trash2 size={18} /> Excluir restaurante</h2>
              <p className="mt-1 text-sm text-muted">O cardápio sai do ar e a equipe perde o acesso. Os dados ficam guardados para restauração ou exportação e depois são apagados de vez.</p>
              {r.subscription.state !== 'suspended' && <p className="mt-2 text-sm font-medium text-warning">Para excluir, suspenda o acesso primeiro.</p>}
              <Button className="mt-3" variant="danger" disabled={r.subscription.state !== 'suspended'} onClick={() => { setError(null); setConfirmSlug(''); setDeleting(true); }}>Excluir restaurante</Button>
            </section>
          )}
        </TabPanel>
      )}

      {current === 'contracts' && (
        <TabPanel id="contracts">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Cada contrato fica guardado com o arquivo assinado. Um contrato registrado com erro é anulado, nunca apagado.</p>
            {contracts.actions && <div className="flex flex-wrap gap-2">{contracts.actions}</div>}
          </div>
          {contracts.history ?? <EmptyState icon={FileSignature} title="Nenhum contrato registrado">Sem contrato, o restaurante fica Pendente: a equipe não acessa o painel e o cardápio fica fora do ar.</EmptyState>}
        </TabPanel>
      )}

      {current === 'payments' && (
        <TabPanel id="payments">
          <GlassCard className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Resumo dos pagamentos</h2>
            <PaymentSummaryCard entries={billing.entries} restaurant={r} />
          </GlassCard>
          <section className="mt-6">
            <h2 className="mb-3 text-xl font-semibold">Histórico de pagamentos</h2>
            {billing.history}
          </section>
        </TabPanel>
      )}

      {current === 'tables' && tables && (
        <TabPanel id="tables">
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
        </TabPanel>
      )}

      {current === 'activity' && (
        <TabPanel id="activity">
          <ActivityList endpoint={`/api/admin/restaurants/${id}/activity`} token={token} />
        </TabPanel>
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
        error={error}
        onConfirm={async () => {
          setError(null);
          if (!ownerForm.validate()) return;
          if (await guard(() => api(`/api/admin/restaurants/${id}/owner`, { body: ownerForm.values, token }), ownerForm.fromServer)) setNewOwner(false);
        }}
        onClose={() => setNewOwner(false)}
      >
        <p>Use quando o titular saiu ou perdeu o acesso. A pessoa escolhida passa a administrar o restaurante e {owner ? `${owner.name} vira Gerente` : 'o restaurante volta a ter titular'}.</p>
        {newOwner && (
          <>
            <Field label="Novo titular">
              <Select name="userId" value={ownerForm.values.userId} onChange={(e) => ownerForm.set('userId', e.target.value)}>
                {candidates.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.username})</option>)}
              </Select>
            </Field>
            <Field label="Motivo" hint="Pelo menos 3 caracteres. Fica nos registros do restaurante." error={ownerForm.errors.reason}>
              <Textarea {...ownerForm.bind('reason')} maxLength={FIELD_RULES.reason.max} rows={3} />
            </Field>
          </>
        )}
      </ConfirmModal>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar restaurante" sheet>
        {editing && (
          <form onSubmit={saveEdit} noValidate className="space-y-4">
            <Field label="Nome do restaurante" error={editForm.errors.name}><Input {...editForm.bind('name')} maxLength={FIELD_RULES.restaurantName.max} autoFocus /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do titular" error={editForm.errors.managerName}><Input {...editForm.bind('managerName')} maxLength={FIELD_RULES.personName.max} /></Field>
              <Field label="Contato do titular" hint="Telefone com DDD ou e-mail." error={editForm.errors.managerContact}><Input {...editForm.bind('managerContact')} maxLength={FIELD_RULES.contact.max} /></Field>
            </div>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              Endereço do cardápio: <span className="font-mono">/{r.slug}</span>
              <button type="button" className="font-semibold text-brand underline-offset-2 hover:underline" onClick={() => { setError(null); slugForm.reset({ slug: r.slug, reason: '' }); setEditing(false); setChangingSlug(true); }}>
                Alterar endereço
              </button>
            </p>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end"><Button type="submit" loading={saving}>Salvar</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={changingSlug} onClose={() => setChangingSlug(false)} title="Alterar endereço do cardápio" sheet>
        {changingSlug && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              if (!slugForm.validate()) return;
              const ok = await guard(() => api(`/api/admin/restaurants/${id}/slug`, { body: slugForm.values, token }), slugForm.fromServer);
              if (ok) setChangingSlug(false);
            }}
            noValidate
            className="space-y-4"
          >
            <p className="text-sm text-muted">
              O endereço atual, <span className="font-mono">/{r.slug}</span>, continua levando ao restaurante: os QR Codes e as tags já impressos seguem funcionando e a equipe não precisa entrar de novo. Nenhum outro restaurante poderá usá-lo.
            </p>
            <Field label="Novo endereço" hint="Letras minúsculas, números e hífen." error={slugForm.errors.slug}>
              <Input {...slugForm.bind('slug')} onChange={(e) => slugForm.set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} maxLength={FIELD_RULES.slug.max} autoCapitalize="none" spellCheck={false} autoFocus />
            </Field>
            <Field label="Motivo" hint="Fica nos registros do restaurante." error={slugForm.errors.reason}>
              <Textarea {...slugForm.bind('reason')} maxLength={FIELD_RULES.reason.max} rows={2} placeholder="Por exemplo: o restaurante mudou de nome" />
            </Field>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setChangingSlug(false)}>Voltar</Button>
              <Button type="submit" loading={saving} disabled={slugForm.values.slug === r.slug}>Alterar endereço</Button>
            </div>
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
      {contracts.modals}
    </>
  );
}

/**
 * The one status of the restaurant, why it is so and the action that fixes it, over
 * the facts behind it: contract, due date, plan and trial.
 */
function StatusPanel({
  sub,
  contract,
  overdueDays,
  onPlan,
  onAdjust,
  action,
  charge,
}: {
  sub: SubscriptionView;
  contract: ContractView | null;
  overdueDays: number;
  onPlan: (() => void) | null;
  onAdjust: (() => void) | null;
  action: React.ReactNode;
  charge: ReturnType<typeof billingLink>;
}) {
  const lines: string[] = [];
  if (sub.status === 'pending') {
    lines.push(sub.contract.nextStartsOn ? `O contrato começa em ${dayBR(sub.contract.nextStartsOn)}. Até lá, a equipe não acessa o painel e o cardápio fica fora do ar.` : 'Sem contrato registrado: a equipe não acessa o painel e o cardápio fica fora do ar.');
  } else if (sub.status === 'ended') {
    lines.push(`Contrato encerrado em ${sub.contract.endsOn ? dayBR(sub.contract.endsOn) : '—'}${sub.contract.nextStartsOn ? `; a renovação começa em ${dayBR(sub.contract.nextStartsOn)}` : ''}. A equipe não acessa o painel e o cardápio está fora do ar.`);
  } else {
    if (sub.reasons.includes('manual')) lines.push('Suspenso manualmente pela Elo Digital: a equipe não acessa o painel; o cardápio continua no ar.');
    if (sub.reasons.includes('overdue')) lines.push(`Vencida há ${plural(overdueDays, 'dia', 'dias')}: registre um pagamento ou ajuste o vencimento para liberar.`);
    if (sub.status === 'grace') lines.push(`Venceu em ${fmt(sub.dueDate)}. A equipe perde o acesso em ${fmt(sub.graceEndsAt)} sem pagamento.`);
    if (sub.status === 'active') lines.push(sub.trial.state === 'running' ? 'Em período de teste: a equipe usa o painel e o cardápio está no ar, sem cobrança até o fim do teste.' : 'Em dia: a equipe usa o painel e o cardápio está no ar.');
  }

  const facts: { icon: typeof Wallet; label: string; value: string; hint?: string | null; tone?: string; onEdit?: (() => void) | null; editLabel?: string }[] = [
    {
      icon: FileSignature,
      label: 'Contrato',
      value: sub.contract.state === 'active' && contract ? `${CONTRACT_KIND_LABEL[contract.kind]} até ${dayBR(sub.contract.endsOn!)}` : sub.contract.state === 'ended' ? 'Encerrado' : sub.contract.nextStartsOn ? `Começa em ${dayBR(sub.contract.nextStartsOn)}` : 'Sem contrato',
      hint: sub.contract.daysLeft !== null ? (sub.contract.daysLeft === 0 ? 'termina hoje' : `faltam ${plural(sub.contract.daysLeft, 'dia', 'dias')}`) : null,
      tone: sub.contract.daysLeft !== null && sub.contract.daysLeft <= CONTRACT_LIMITS.warnDays ? 'text-warning' : undefined,
    },
    {
      icon: CalendarClock,
      label: 'Vencimento',
      value: sub.contract.state === 'pending' ? 'Começa com o contrato' : fmt(sub.dueDate),
      hint: sub.contract.state === 'pending' ? null : sub.reasons.includes('overdue') || sub.status === 'grace' ? `vencida há ${plural(Math.max(overdueDays, 0), 'dia', 'dias')}` : `em ${plural(Math.max(Math.ceil((new Date(sub.dueDate).getTime() - Date.now()) / 86_400_000), 0), 'dia', 'dias')}`,
      tone: sub.status === 'grace' ? 'text-warning' : sub.reasons.includes('overdue') ? 'text-danger' : undefined,
      onEdit: onAdjust,
      editLabel: 'Ajustar',
    },
    {
      icon: Layers,
      label: 'Plano',
      value: sub.plan ? `${sub.plan.name} · ${formatBRL(sub.plan.priceCents)}` : 'Sem plano',
      hint: sub.plan ? cycleLabel(sub.plan.cycleMonths) : null,
      onEdit: onPlan,
      editLabel: 'Trocar',
    },
  ];
  if (sub.trial.state !== 'none' && sub.trial.endsOn) {
    facts.push({
      icon: Hourglass,
      label: 'Período de teste',
      value: sub.trial.state === 'running' ? `Até ${dayBR(sub.trial.endsOn)}` : sub.trial.state === 'scheduled' ? `Começa em ${dayBR(sub.trial.startsOn!)}` : sub.trial.state === 'finished' ? 'Concluído' : 'Encerrado antes',
      hint: sub.trial.state === 'running' ? (sub.trial.daysLeft === 0 ? 'último dia' : `faltam ${plural(sub.trial.daysLeft!, 'dia', 'dias')}`) : sub.trial.state === 'ended_by_conversion' ? 'na conversão em definitivo' : `${plural(sub.trial.days, 'dia', 'dias')} previstos`,
    });
  }

  return (
    <GlassCard strong className="p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Badge tone={STATUS_TONE[sub.status]} dot>{RESTAURANT_STATUS_LABEL[sub.status]}</Badge>
          {lines.map((l) => <p key={l} className="text-sm text-muted">{l}</p>)}
        </div>
        {(action || charge) && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {charge && (
              <a href={charge.href} target="_blank" rel="noreferrer" className="btn-glass inline-flex items-center justify-center gap-2 rounded-pill px-4 py-2.5 text-sm font-semibold">
                <charge.Icon size={16} /> {charge.label}
              </a>
            )}
            {action}
          </div>
        )}
      </div>
      <dl className={`mt-5 grid gap-3 border-t border-line/40 pt-5 sm:grid-cols-2 ${facts.length > 3 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {facts.map((f) => (
          <div key={f.label} className="flex items-start gap-3 rounded-md bg-leaf-100/40 px-4 py-3">
            <f.icon size={18} className="mt-0.5 shrink-0 text-brand" />
            <div className="min-w-0 flex-1">
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className={`font-semibold [overflow-wrap:anywhere] ${f.tone ?? ''}`}>{f.value}</dd>
              {f.hint && <dd className="text-xs text-muted">{f.hint}</dd>}
            </div>
            {f.onEdit && <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={f.onEdit}>{f.editLabel}</Button>}
          </div>
        ))}
      </dl>
    </GlassCard>
  );
}

function RestaurantView({ id }: { id: string }) {
  return (
    <Suspense fallback={<SkeletonCards count={3} />}>
      <View id={id} />
    </Suspense>
  );
}

export default function RestaurantPage({ params }: { params: { id: string } }) {
  return <RestaurantView id={params.id} />;
}
