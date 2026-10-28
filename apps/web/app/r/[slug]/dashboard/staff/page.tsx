'use client';

import { KeyRound, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { Badge, Button, DataTable, EmptyState, Field, Modal, PageHeader, SkeletonCards } from '@elo/ui';
import { Shell, useStaff } from '../../_components/shell';

interface Staff {
  id: string;
  username: string;
  role: string;
  active: boolean;
}

const ROLES = [
  ['waiter', 'Garçom'],
  ['kitchen', 'Cozinha'],
  ['cashier', 'Caixa'],
  ['restaurant_admin', 'Administrador'],
];
const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES);

function View() {
  const { token } = useStaff();
  const [list, setList] = useState<Staff[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'waiter' });
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState<Staff | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(async () => setList(await api<Staff[]>('/api/staff', { token })), [token]);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api('/api/staff', { body: form, token });
      setForm({ username: '', password: '', role: form.role });
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? 'Esse usuário já existe.' : 'Confira os campos: usuário em minúsculas e senha com 8+ caracteres.');
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
    } catch {
      setError('A senha precisa ter 8+ caracteres.');
    }
  };

  const toggle = async (u: Staff) => {
    await api(`/api/staff/${u.id}/active`, { method: 'PATCH', body: { active: !u.active }, token });
    await load();
  };

  return (
    <>
      <PageHeader title="Equipe" actions={<Button onClick={() => { setError(null); setOpen(true); }}><UserPlus size={17} /> Novo usuário</Button>} />
      {!list && <SkeletonCards count={2} />}
      {list?.length === 0 && <EmptyState icon={Users} title="Nenhum usuário ainda">Cadastre garçons, cozinha e caixa.</EmptyState>}
      {list && list.length > 0 && (
        <DataTable
          rows={list}
          rowKey={(u) => u.id}
          columns={[
            { key: 'u', header: 'Usuário', cell: (u) => <span className="font-semibold">{u.username}</span> },
            { key: 'r', header: 'Perfil', cell: (u) => <Badge tone="brand">{ROLE_LABEL[u.role] ?? u.role}</Badge> },
            { key: 's', header: 'Situação', cell: (u) => <Badge tone={u.active ? 'success' : 'neutral'} dot>{u.active ? 'Ativo' : 'Desativado'}</Badge> },
            { key: 'a', header: '', align: 'right', cell: (u) => (
              <span className="flex justify-end gap-1">
                <Button variant="ghost" onClick={() => { setError(null); setNewPassword(''); setResetting(u); }}><KeyRound size={15} /> Nova senha</Button>
                <Button variant="ghost" onClick={() => toggle(u)}>{u.active ? 'Desativar' : 'Ativar'}</Button>
              </span>
            ) },
          ]}
        />
      )}
      <Modal open={!!resetting} onClose={() => setResetting(null)} title={`Nova senha para ${resetting?.username ?? ''}`} sheet>
        <form onSubmit={reset} className="space-y-4">
          <Field label="Nova senha" hint="Pelo menos 8 caracteres. A pessoa pode trocar em Minha conta."><input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required autoFocus /></Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit">Redefinir senha</Button></div>
        </form>
      </Modal>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo usuário" sheet>
        <form onSubmit={create} className="space-y-4">
          <Field label="Usuário" hint="Minúsculas, números, ponto, hífen ou sublinhado."><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus /></Field>
          <Field label="Senha" hint="Pelo menos 8 caracteres."><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
          <Field label="Perfil">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit">Criar usuário</Button></div>
        </form>
      </Modal>
    </>
  );
}

export default function StaffPage() {
  return (
    <Shell roles={['restaurant_admin']}>
      <View />
    </Shell>
  );
}
