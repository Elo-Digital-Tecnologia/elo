'use client';

import { KeyRound, Power, ShieldCheck, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { FIELD_RULES, type Permission, PERMISSION_GROUPS, upgradePermissions, withRequired } from '@elo/core';
import { ActionMenu, Badge, Button, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PasswordInput, SkeletonCards } from '@elo/ui';
import { rule, unexpected, useForm } from '../../../_lib/use-form';
import { useAdmin } from '../../_components/shell';

interface Member {
  id: string;
  username: string;
  name: string;
  permissions: string[];
  active: boolean;
}

const EMPTY = { name: '', username: '', password: '' };
const CHECKS = { name: rule(FIELD_RULES.personName), username: rule(FIELD_RULES.username), password: rule(FIELD_RULES.password) };
const RESET_CHECKS = { password: rule(FIELD_RULES.password) };

const ERRORS: Record<string, string> = {
  username_taken: 'Esse usuário já existe na equipe Elo.',
  cannot_grant: 'Você marcou uma permissão que não pode conceder.',
  self: 'Você não pode alterar a própria conta por aqui.',
};

/** A known refusal from the API in words, or the honest "something failed". */
const messageOf = (e: unknown) => (e instanceof ApiError && ERRORS[e.code]) || unexpected(e);

/** "Restaurantes: Ver, Cadastrar" per group, so a member with many permissions still fits in a row. */
function summary(perms: string[]) {
  const held = upgradePermissions(perms);
  return PERMISSION_GROUPS.map((g) => ({ label: g.label, items: g.items.filter((i) => held.includes(i.permission)).map((i) => i.label) })).filter((g) => g.items.length);
}

/** Removing a permission also removes the ones that depend on it. */
function toggled(current: Permission[], p: Permission): Permission[] {
  if (!current.includes(p)) return withRequired([...current, p]);
  return current.filter((q) => q !== p && !withRequired([q]).includes(p));
}

function PermissionPicker({ value, onChange, grantable }: { value: Permission[]; onChange: (v: Permission[]) => void; grantable: (p: Permission) => boolean }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-sm font-medium">O que esta pessoa pode fazer</legend>
      {PERMISSION_GROUPS.map((g) => (
        <div key={g.label}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {g.items.map((i) => {
              const allowed = grantable(i.permission);
              const on = value.includes(i.permission);
              return (
                <label key={i.permission} title={allowed ? undefined : 'Você não pode conceder esta permissão.'} className={`flex items-start gap-3 rounded-md border px-3.5 py-3 text-sm transition ${on ? 'border-brand bg-brand/10' : 'border-line/50'} ${allowed ? 'cursor-pointer hover:border-brand/50' : 'cursor-not-allowed opacity-60'}`}>
                  <input type="checkbox" className="mt-0.5" checked={on} disabled={!allowed} onChange={() => onChange(toggled(value, i.permission))} />
                  <span className="min-w-0">
                    <span className="block font-medium">{i.label}</span>
                    {i.hint && <span className="block text-xs text-muted">{i.hint}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </fieldset>
  );
}

function View() {
  const { token, roles, sub, can } = useAdmin();
  const [list, setList] = useState<Member[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const form = useForm(EMPTY, CHECKS, { username_taken: ERRORS.username_taken });
  const [perms, setPerms] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [resetting, setResetting] = useState<Member | null>(null);
  const resetForm = useForm({ password: '' }, RESET_CHECKS);
  const [editing, setEditing] = useState<Member | null>(null);
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [removing, setRemoving] = useState<Member | null>(null);

  const isSuper = roles.includes('superadmin');
  /** Mirrors the server: hand out only what you hold; deletion only by the superadmin. */
  const grantable = (p: Permission) => isSuper || (p !== 'restaurants.delete' && can(p));

  const load = useCallback(async () => {
    try {
      setList(await api<Member[]>('/api/admin/staff', { token }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.validate()) return;
    try {
      await api('/api/admin/staff', { body: { ...form.values, permissions: perms }, token });
      form.reset(EMPTY);
      setPerms([]);
      setOpen(false);
      await load();
    } catch (err) {
      if (!form.fromServer(err)) setError(messageOf(err));
    }
  };

  const savePerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    try {
      await api(`/api/admin/staff/${editing.id}`, { method: 'PATCH', body: { permissions: editPerms }, token });
      setEditing(null);
      await load();
    } catch (err) {
      setError(messageOf(err));
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetting) return;
    setError(null);
    if (!resetForm.validate()) return;
    try {
      await api(`/api/admin/staff/${resetting.id}/password`, { method: 'PATCH', body: { password: resetForm.values.password }, token });
      setResetting(null);
      resetForm.reset({ password: '' });
    } catch (err) {
      if (!resetForm.fromServer(err)) setError(messageOf(err));
    }
  };

  const toggle = async (m: Member) => {
    setListError(null);
    try {
      await api(`/api/admin/staff/${m.id}/active`, { method: 'PATCH', body: { active: !m.active }, token });
      await load();
    } catch {
      setListError('Não foi possível mudar a situação.');
    }
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await api(`/api/admin/staff/${removing.id}`, { method: 'DELETE', token });
      setRemoving(null);
      await load();
    } catch {
      setError('Não foi possível excluir.');
    }
  };

  return (
    <>
      <PageHeader title="Equipe" actions={<Button onClick={() => { setError(null); setPerms([]); setOpen(true); }}><UserPlus size={17} /> Novo integrante</Button>} />
      {listError && <p role="alert" className="mb-4 text-sm text-danger">{listError}</p>}
      {failed && <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar a equipe.</ErrorState>}
      {!list && !failed && <SkeletonCards count={2} />}
      {list?.length === 0 && <EmptyState icon={UsersRound} title="Nenhum integrante" action={<Button onClick={() => setOpen(true)}>Adicionar integrante</Button>}>Crie logins e escolha as permissões.</EmptyState>}
      {list && list.length > 0 && (
        <DataTable
          rows={list}
          rowKey={(m) => m.id}
          mobile="cards"
          columns={[
            { key: 'u', header: 'Nome', mobile: 'title', cell: (m) => <span className="block min-w-0"><span className="block truncate font-semibold">{m.name}{m.id === sub && <span className="ml-1.5 font-normal text-muted">(você)</span>}</span><span className="block truncate text-xs text-muted">{m.username}</span></span> },
            {
              key: 'p',
              header: 'Permissões',
              cell: (m) => {
                const groups = summary(m.permissions);
                return groups.length ? (
                  <span className="flex flex-col gap-1 text-xs">
                    {groups.map((g) => <span key={g.label}><strong className="font-semibold">{g.label}:</strong> <span className="text-muted">{g.items.join(', ')}</span></span>)}
                  </span>
                ) : <span className="text-muted">Nenhuma</span>;
              },
            },
            { key: 's', header: 'Situação', cell: (m) => <Badge tone={m.active ? 'success' : 'neutral'} dot>{m.active ? 'Ativo' : 'Desativado'}</Badge> },
            {
              key: 'a',
              header: '',
              align: 'right',
              mobile: 'actions',
              cell: (m) => {
                const self = m.id === sub;
                const own = self ? 'É a sua conta: peça a outra pessoa da equipe.' : null;
                return (
                  <span className="inline-flex items-center justify-end gap-1">
                    <Button variant="ghost" disabled={self} title={own ?? undefined} onClick={() => { setError(null); setEditPerms(upgradePermissions(m.permissions)); setEditing(m); }}>
                      <ShieldCheck size={16} /> <span className="hidden md:inline">Permissões</span>
                    </Button>
                    <ActionMenu
                      title={m.name}
                      items={[
                        { label: 'Nova senha', icon: KeyRound, onSelect: () => { setError(null); resetForm.reset({ password: '' }); setResetting(m); } },
                        { label: m.active ? 'Desativar acesso' : 'Reativar acesso', icon: Power, disabledReason: own, onSelect: () => void toggle(m) },
                        { label: 'Excluir', icon: Trash2, danger: true, disabledReason: own, onSelect: () => { setError(null); setRemoving(m); } },
                      ]}
                    />
                  </span>
                );
              },
            },
          ]}
        />
      )}

      <Modal open={!!resetting} onClose={() => setResetting(null)} title={`Nova senha de ${resetting?.name ?? ''}`}>
        <form onSubmit={resetPassword} noValidate className="space-y-4">
          <Field label="Nova senha" hint="Pelo menos 8 caracteres." error={resetForm.errors.password}>
            <PasswordInput {...resetForm.bind('password')} maxLength={FIELD_RULES.password.max} autoComplete="new-password" autoFocus />
          </Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit">Salvar senha</Button></div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Permissões de ${editing?.name ?? ''}`} sheet>
        <form onSubmit={savePerms} className="space-y-4">
          <PermissionPicker value={editPerms} onChange={setEditPerms} grantable={grantable} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit">Salvar</Button></div>
        </form>
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} title={`Excluir ${removing?.name ?? ''}?`} sheet>
        <p className="text-sm text-muted">A pessoa perde o acesso ao painel Elo. O que ela registrou (pagamentos, entradas em restaurantes) continua no histórico.</p>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>Voltar</Button>
          <Button variant="danger" onClick={remove}>Excluir</Button>
        </div>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo integrante" sheet>
        <form onSubmit={create} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" error={form.errors.name}><Input {...form.bind('name')} maxLength={FIELD_RULES.personName.max} autoFocus /></Field>
            <Field label="Usuário" hint="Minúsculas, números, ponto, hífen ou sublinhado." error={form.errors.username}>
              <Input {...form.bind('username')} onChange={(e) => form.set('username', e.target.value.toLowerCase())} maxLength={FIELD_RULES.username.max} autoCapitalize="none" />
            </Field>
            <Field label="Senha" hint="Pelo menos 8 caracteres." error={form.errors.password}>
              <PasswordInput {...form.bind('password')} maxLength={FIELD_RULES.password.max} autoComplete="new-password" />
            </Field>
          </div>
          <PermissionPicker value={perms} onChange={setPerms} grantable={grantable} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit">Criar integrante</Button></div>
        </form>
      </Modal>
    </>
  );
}

export default function TeamPage() {
  return <View />;
}
