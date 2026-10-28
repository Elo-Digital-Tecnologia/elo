'use client';

import { KeyRound, UserPlus, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { ALL_PERMISSIONS } from '@elo/core';
import { Badge, Button, DataTable, EmptyState, ErrorState, Field, Modal, PageHeader, PasswordInput, SkeletonCards } from '@elo/ui';
import { Shell, useAdmin } from '../_components/shell';

interface Member {
  id: string;
  username: string;
  permissions: string[];
  active: boolean;
}

const PERM_LABEL: Record<string, string> = {
  restaurants: 'Restaurantes',
  subscriptions: 'Assinaturas e pagamentos',
  access_control: 'Suspender e reativar',
  settings: 'Equipe e configurações',
  table_tokens: 'Regravar tokens de mesa',
  restaurant_access: 'Abrir o painel dos restaurantes',
};

function View() {
  const { token } = useAdmin();
  const [list, setList] = useState<Member[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [perms, setPerms] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState('');

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
    try {
      await api('/api/admin/staff', { body: { ...form, permissions: perms }, token });
      setForm({ username: '', password: '' });
      setPerms([]);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? 'Esse usuário já existe.' : 'Confira os campos: usuário em minúsculas e senha com 8+ caracteres.');
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetting) return;
    setError(null);
    try {
      await api(`/api/admin/staff/${resetting.id}/password`, { method: 'PATCH', body: { password: newPassword }, token });
      setResetting(null);
      setNewPassword('');
    } catch {
      setError('Não foi possível trocar a senha. Use 8 caracteres ou mais.');
    }
  };

  const toggle = async (m: Member) => {
    await api(`/api/admin/staff/${m.id}/active`, { method: 'PATCH', body: { active: !m.active }, token });
    await load();
  };

  return (
    <>
      <PageHeader title="Equipe" actions={<Button onClick={() => { setError(null); setOpen(true); }}><UserPlus size={17} /> Novo integrante</Button>} />
      {failed && <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar a equipe.</ErrorState>}
      {!list && !failed && <SkeletonCards count={2} />}
      {list?.length === 0 && <EmptyState icon={UsersRound} title="Nenhum integrante" action={<Button onClick={() => setOpen(true)}>Adicionar integrante</Button>}>Crie logins e escolha as permissões.</EmptyState>}
      {list && list.length > 0 && (
        <DataTable
          rows={list}
          rowKey={(m) => m.id}
          columns={[
            { key: 'u', header: 'Usuário', cell: (m) => <span className="font-semibold">{m.username}</span> },
            { key: 'p', header: 'Permissões', cell: (m) => <span className="flex flex-wrap gap-1.5">{m.permissions.length ? m.permissions.map((p) => <Badge key={p} tone="brand">{PERM_LABEL[p]}</Badge>) : <span className="text-muted">Nenhuma</span>}</span> },
            { key: 's', header: 'Situação', cell: (m) => <Badge tone={m.active ? 'success' : 'neutral'} dot>{m.active ? 'Ativo' : 'Desativado'}</Badge> },
            { key: 'a', header: '', align: 'right', cell: (m) => (<span className="inline-flex gap-1"><Button variant="ghost" onClick={() => { setError(null); setNewPassword(''); setResetting(m); }}><KeyRound size={16} /> Nova senha</Button><Button variant="ghost" onClick={() => toggle(m)}>{m.active ? 'Desativar' : 'Ativar'}</Button></span>) },
          ]}
        />
      )}
      <Modal open={!!resetting} onClose={() => setResetting(null)} title={`Nova senha de ${resetting?.username ?? ''}`}>
        <form onSubmit={resetPassword} className="space-y-4">
          <Field label="Nova senha" hint="Pelo menos 8 caracteres."><PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" required autoFocus /></Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit">Salvar senha</Button></div>
        </form>
      </Modal>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo integrante" sheet>
        <form onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Usuário"><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus /></Field>
            <Field label="Senha" hint="Pelo menos 8 caracteres."><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">O que esta pessoa pode fazer</legend>
            <div className="space-y-2">
              {ALL_PERMISSIONS.map((p) => (
                <label key={p} className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition ${perms.includes(p) ? 'border-brand bg-brand/10' : 'border-line/50 hover:border-brand/50'}`}>
                  <input type="checkbox" checked={perms.includes(p)} onChange={() => setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))} />
                  {PERM_LABEL[p]}
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit">Criar integrante</Button></div>
        </form>
      </Modal>
    </>
  );
}

export default function TeamPage() {
  return (
    <Shell>
      <View />
    </Shell>
  );
}
