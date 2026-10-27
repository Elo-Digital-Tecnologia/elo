'use client';

import { UserPlus, Users } from 'lucide-react';
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
  ['restaurant_admin', 'Administrador'],
];
const ROLE_LABEL: Record<string, string> = { ...Object.fromEntries(ROLES), cashier: 'Caixa' };

function View() {
  const { token } = useStaff();
  const [list, setList] = useState<Staff[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'waiter' });
  const [error, setError] = useState<string | null>(null);

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

  const toggle = async (u: Staff) => {
    await api(`/api/staff/${u.id}/active`, { method: 'PATCH', body: { active: !u.active }, token });
    await load();
  };

  return (
    <>
      <PageHeader title="Equipe" description="Quem acessa o sistema e com qual perfil." actions={<Button onClick={() => { setError(null); setOpen(true); }}><UserPlus size={17} /> Novo usuário</Button>} />
      {!list && <SkeletonCards count={2} />}
      {list?.length === 0 && <EmptyState icon={Users} title="Nenhum usuário ainda">Crie logins para garçons e cozinha.</EmptyState>}
      {list && list.length > 0 && (
        <DataTable
          rows={list}
          rowKey={(u) => u.id}
          columns={[
            { key: 'u', header: 'Usuário', cell: (u) => <span className="font-semibold">{u.username}</span> },
            { key: 'r', header: 'Perfil', cell: (u) => <Badge tone="brand">{ROLE_LABEL[u.role] ?? u.role}</Badge> },
            { key: 's', header: 'Situação', cell: (u) => <Badge tone={u.active ? 'success' : 'neutral'} dot>{u.active ? 'Ativo' : 'Desativado'}</Badge> },
            { key: 'a', header: '', align: 'right', cell: (u) => <Button variant="ghost" onClick={() => toggle(u)}>{u.active ? 'Desativar' : 'Ativar'}</Button> },
          ]}
        />
      )}
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
