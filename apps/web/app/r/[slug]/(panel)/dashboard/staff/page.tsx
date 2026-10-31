'use client';

import { Crown, KeyRound, Pencil, Power, Trash2, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { formatDuration, ROLE_LABEL, type Role, RestaurantStaffRoles, type StaffPerformanceRow, type StaffReportView } from '@elo/core';
import { ActionMenu, Badge, Button, DataTable, EmptyState, Field, Input, Modal, PageHeader, PasswordInput, SkeletonCards } from '@elo/ui';
import { RequireRoles, useStaff } from '../../../_components/shell';

interface Staff {
  id: string;
  username: string;
  name: string;
  displayName: string | null;
  roles: Role[];
  active: boolean;
}

interface FormState {
  name: string;
  displayName: string;
  username: string;
  password: string;
  roles: Role[];
}

const EMPTY: FormState = { name: '', displayName: '', username: '', password: '', roles: ['waiter'] };

const ERRORS: Record<string, string> = {
  username_taken: 'Esse usuário já existe na equipe.',
  not_above: 'Gerentes cuidam só de garçons, cozinha e caixa. Gerentes são definidos pelo titular.',
  self: 'Você não pode desativar, excluir ou trocar os perfis da própria conta.',
  owner: 'O titular não é desativado nem excluído. Para trocar, use "Tornar titular".',
  owner_locked: 'Só o próprio titular altera os dados dele.',
  wrong_password: 'Senha incorreta.',
  invalid_owner: 'Escolha alguém ativo da equipe.',
};

/** The owner role is never picked in the form: it only moves through a transfer. */
const PICKABLE = RestaurantStaffRoles.filter((r) => r !== 'restaurant_admin');
const roleLabel = (r: Role) => ROLE_LABEL[r] ?? r;

/** Service numbers apply to waiters only: they answer calls and open and close tables. */
const metricsOf = (roles: Role[]) => ({
  calls: roles.includes('waiter'),
  tables: roles.includes('waiter'),
});

const LEADS: Role[] = ['restaurant_admin', 'manager'];
const leads = (roles: readonly Role[]) => roles.some((r) => LEADS.includes(r));

const messageOf = (e: unknown, fallback: string) => (e instanceof ApiError ? ERRORS[e.code] ?? fallback : fallback);

function View() {
  const { token, sub, roles: myRoles, impersonated } = useStaff();
  /** The owner (and Elo support) handles managers; a manager only the rest of the team. */
  const isOwner = myRoles.includes('restaurant_admin') && !impersonated;
  const isAdmin = impersonated || isOwner;
  const [list, setList] = useState<Staff[] | null>(null);
  const [editing, setEditing] = useState<Staff | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState<Staff | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [removing, setRemoving] = useState<Staff | null>(null);
  const [viewing, setViewing] = useState<Staff | null>(null);
  const [stats, setStats] = useState<StaffPerformanceRow | null | undefined>(undefined);
  const [listError, setListError] = useState<string | null>(null);
  const [handing, setHanding] = useState<Staff | null>(null);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setList(await api<Staff[]>('/api/staff', { token })), [token]);
  useEffect(() => {
    void load();
  }, [load]);

  /** Mirrors the server rule so locked actions show up disabled, with the reason on hover. */
  const lockOf = (u: Staff): string | null => {
    if (u.id === sub) return 'Sua conta: altere o nome em Editar e a senha em Minha conta.';
    if (!isAdmin && leads(u.roles)) return ERRORS.not_above;
    if (u.roles.includes('restaurant_admin') && !impersonated) return ERRORS.owner_locked;
    return null;
  };
  const ownerLock = (u: Staff) => (u.roles.includes('restaurant_admin') ? ERRORS.owner : null);

  const openForm = (target: Staff | 'new') => {
    setError(null);
    setForm(target === 'new' ? EMPTY : { name: target.name, displayName: target.displayName ?? '', username: target.username, password: '', roles: target.roles });
    setEditing(target);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roles.length) return setError('Escolha pelo menos um perfil.');
    setError(null);
    try {
      if (editing === 'new') {
        await api('/api/staff', { body: { ...form, displayName: form.displayName || undefined }, token });
      } else if (editing) {
        const self = editing.id === sub;
        await api(`/api/staff/${editing.id}`, {
          method: 'PATCH',
          body: { name: form.name, displayName: form.displayName || null, ...(self ? {} : { roles: form.roles }) },
          token,
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(messageOf(err, 'Confira os campos: nome com letras, usuário em minúsculas e senha com 8 ou mais caracteres.'));
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetting) return;
    setError(null);
    try {
      await api(`/api/staff/${resetting.id}/password`, { method: 'PATCH', body: { password: newPassword }, token });
      setResetting(null);
      setNewPassword('');
    } catch (err) {
      setError(messageOf(err, 'A senha precisa ter 8 ou mais caracteres.'));
    }
  };

  const toggle = async (u: Staff) => {
    setListError(null);
    try {
      await api(`/api/staff/${u.id}/active`, { method: 'PATCH', body: { active: !u.active }, token });
      await load();
    } catch (err) {
      setListError(messageOf(err, 'Não foi possível mudar a situação.'));
    }
  };

  const remove = async () => {
    if (!removing) return;
    setError(null);
    try {
      await api(`/api/staff/${removing.id}`, { method: 'DELETE', token });
      setRemoving(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'staff_busy') {
        const tables = Array.isArray(err.data.tables) ? (err.data.tables as string[]).join(', ') : '';
        setError(`${removing.name} ainda atende: ${tables}. Feche as mesas ou peça para outro garçom assumir antes de excluir.`);
      } else setError(messageOf(err, 'Não foi possível excluir.'));
    }
  };

  const handOver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handing) return;
    setError(null);
    setBusy(true);
    try {
      await api(`/api/staff/${handing.id}/transfer-ownership`, { body: { password: ownerPassword }, token });
      setHanding(null);
      setOwnerPassword('');
      await load();
    } catch (err) {
      setError(messageOf(err, 'Não foi possível transferir.'));
    } finally {
      setBusy(false);
    }
  };

  const showStats = async (u: Staff) => {
    setViewing(u);
    setStats(undefined);
    const m = metricsOf(u.roles);
    if (!m.calls && !m.tables) return;
    try {
      const rep = await api<StaffReportView>('/api/reports/staff', { token });
      setStats(rep.rows.find((r) => r.id === u.id) ?? null);
    } catch {
      setStats(null);
    }
  };

  const toggleRole = (r: Role) =>
    setForm((f) => ({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] }));

  const isNew = editing === 'new';
  const target = editing === 'new' ? null : editing;
  const editingSelf = target?.id === sub;

  return (
    <>
      <PageHeader title="Equipe" actions={<Button onClick={() => openForm('new')}><UserPlus size={17} /> Nova pessoa</Button>} />
      {listError && <p role="alert" className="mb-4 text-sm text-danger">{listError}</p>}
      {!list && <SkeletonCards count={2} />}
      {list?.length === 0 && <EmptyState icon={Users} title="Ninguém na equipe ainda">Cadastre garçons, cozinha e caixa.</EmptyState>}
      {list && list.length > 0 && (
        <DataTable
          rows={list}
          rowKey={(u) => u.id}
          mobile="cards"
          columns={[
            {
              key: 'n',
              header: 'Nome',
              mobile: 'title',
              cell: (u) => (
                <button className="min-w-0 text-left" onClick={() => showStats(u)}>
                  <span className="block truncate font-semibold hover:underline">{u.name}{u.id === sub && <span className="ml-1.5 font-normal text-muted">(você)</span>}</span>
                  <span className="block truncate text-xs text-muted">{u.username}</span>
                </button>
              ),
            },
            { key: 'r', header: 'Perfis', cell: (u) => <span className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone={r === 'restaurant_admin' ? 'success' : 'brand'}>{roleLabel(r)}</Badge>)}</span> },
            { key: 's', header: 'Situação', cell: (u) => <Badge tone={u.active ? 'success' : 'neutral'} dot>{u.active ? 'Ativo' : 'Desativado'}</Badge> },
            {
              key: 'a',
              header: '',
              align: 'right',
              mobile: 'actions',
              cell: (u) => {
                const lock = lockOf(u);
                const removal = lock ?? ownerLock(u);
                const self = u.id === sub;
                return (
                  <span className="inline-flex items-center justify-end gap-1">
                    <Button variant="ghost" disabled={!!lock && !self} onClick={() => openForm(u)} aria-label={`Editar ${u.name}`} title={lock && !self ? lock : undefined}>
                      <Pencil size={15} /> <span className="hidden md:inline">Editar</span>
                    </Button>
                    <ActionMenu
                      title={u.name}
                      items={[
                        { label: 'Tornar titular', icon: Crown, hidden: !isOwner || self || !u.active, onSelect: () => { setError(null); setOwnerPassword(''); setHanding(u); } },
                        { label: 'Nova senha', icon: KeyRound, disabledReason: lock, onSelect: () => { setError(null); setNewPassword(''); setResetting(u); } },
                        { label: u.active ? 'Desativar acesso' : 'Reativar acesso', icon: Power, disabledReason: removal, onSelect: () => void toggle(u) },
                        { label: 'Excluir', icon: Trash2, danger: true, disabledReason: removal, onSelect: () => { setError(null); setRemoving(u); } },
                      ]}
                    />
                  </span>
                );
              },
            },
          ]}
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'Nova pessoa' : `Editar ${target?.name ?? ''}`} sheet>
        <form onSubmit={save} className="space-y-4">
          <Field label="Nome completo"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} maxLength={80} required autoFocus /></Field>
          <Field label="Nome para o cliente" hint="Aparece na mesa, como em &quot;Ana vai até a sua mesa&quot;. Vazio usa o primeiro nome.">
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} maxLength={30} placeholder={form.name.trim().split(/\s+/)[0] || 'Ana'} />
          </Field>
          {isNew && (
            <>
              <Field label="Usuário" hint="Minúsculas, números, ponto, hífen ou sublinhado."><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} autoCapitalize="none" required /></Field>
              <Field label="Senha" hint="Pelo menos 8 caracteres."><PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" minLength={8} required /></Field>
            </>
          )}
          <fieldset disabled={editingSelf}>
            <legend className="mb-2 text-sm font-medium">Perfis</legend>
            <div className="grid grid-cols-2 gap-2">
              {PICKABLE.map((r) => {
                const locked = !isAdmin && LEADS.includes(r);
                return (
                  <label key={r} title={locked ? ERRORS.not_above : undefined} className={`surface flex items-center gap-2.5 px-3.5 py-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10 ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    <input type="checkbox" checked={form.roles.includes(r)} disabled={locked} onChange={() => toggleRole(r)} />
                    {ROLE_LABEL[r]}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">{editingSelf ? 'Você não pode trocar os perfis da própria conta.' : 'Marque mais de um quando a pessoa atua em mais de uma área.'}</p>
          </fieldset>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit">{isNew ? 'Cadastrar' : 'Salvar'}</Button></div>
        </form>
      </Modal>

      <Modal open={!!resetting} onClose={() => setResetting(null)} title={`Nova senha para ${resetting?.name ?? ''}`} sheet>
        <form onSubmit={reset} className="space-y-4">
          <Field label="Nova senha" hint="Pelo menos 8 caracteres. A pessoa pode trocar em Minha conta."><PasswordInput autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required autoFocus /></Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit">Redefinir senha</Button></div>
        </form>
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} title={`Excluir ${removing?.name ?? ''}?`} sheet>
        <p className="text-sm text-muted">A pessoa perde o acesso e sai da lista. Os chamados, as mesas e os registros dela continuam nos relatórios. O usuário {removing?.username} fica livre para uma nova conta.</p>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>Voltar</Button>
          <Button variant="danger" onClick={remove}>Excluir</Button>
        </div>
      </Modal>

      <Modal open={!!handing} onClose={() => setHanding(null)} title={`Tornar ${handing?.name ?? ''} titular?`} sheet>
        <form onSubmit={handOver} className="space-y-4 text-sm">
          <p className="text-muted">
            {handing?.name} passa a administrar o restaurante, com Configurações e Assinatura. Você vira <strong>Gerente</strong> e só volta a ser titular se essa pessoa transferir de volta.
          </p>
          <Field label="Sua senha"><PasswordInput autoComplete="current-password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} required autoFocus /></Field>
          {error && <p role="alert" className="text-danger">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" type="button" onClick={() => setHanding(null)}>Voltar</Button>
            <Button type="submit" variant="danger" loading={busy}>Transferir</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name ?? ''} sheet>
        {viewing && <Profile staff={viewing} stats={stats} />}
      </Modal>
    </>
  );
}

function Profile({ staff, stats }: { staff: Staff; stats: StaffPerformanceRow | null | undefined }) {
  const m = metricsOf(staff.roles);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {staff.roles.map((r) => <Badge key={r} tone={r === 'restaurant_admin' ? 'success' : 'brand'}>{roleLabel(r)}</Badge>)}
        <span className="ml-1 text-sm text-muted">{staff.username}</span>
      </div>
      {!m.calls && !m.tables ? (
        <p className="text-sm text-muted">Os números de atendimento valem para o salão: chamados e mesas. Cozinha e caixa ainda não têm números próprios.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">Últimos 30 dias</p>
          {stats === undefined && <SkeletonCards count={1} />}
          {stats === null && <p className="text-sm text-muted">Sem atendimentos registrados no período.</p>}
          {stats && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {m.calls && <StatLine label="Chamados atendidos" value={String(stats.callsAnswered)} />}
              {m.calls && <StatLine label="Resposta ao chamado" value={formatDuration(stats.avgCallSeconds)} />}
              {m.tables && <StatLine label="Mesas abertas" value={String(stats.tablesOpened)} />}
              {m.tables && <StatLine label="Espera pela abertura" value={formatDuration(stats.avgOpenSeconds)} />}
              {m.tables && <StatLine label="Mesas fechadas" value={String(stats.tablesClosed)} />}
            </dl>
          )}
        </>
      )}
    </>
  );
}

const StatLine = ({ label, value }: { label: string; value: string }) => (
  <div className="surface px-4 py-3">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="mt-1 font-display text-xl font-bold tabular-nums">{value}</dd>
  </div>
);

export default function StaffPage() {
  return (
    <RequireRoles roles={['restaurant_admin', 'manager']}>
      <View />
    </RequireRoles>
  );
}
