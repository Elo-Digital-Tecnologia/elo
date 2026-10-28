'use client';

import { Building2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { accessState } from '@elo/core';
import { Badge, Button, DataTable, EmptyState, ErrorState, Field, Modal, PageHeader, SkeletonCards } from '@elo/ui';
import { Shell, useAdmin } from '../_components/shell';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  dueDate: string;
  suspended: boolean;
}

const STATE = { active: { label: 'Ativa', tone: 'success' }, grace: { label: 'Em tolerância', tone: 'warning' }, suspended: { label: 'Suspensa', tone: 'danger' } } as const;
const EMPTY = { name: '', managerName: '', managerContact: '', dueDate: '', adminUsername: '', adminPassword: '' };

function View() {
  const { token } = useAdmin();
  const router = useRouter();
  const [list, setList] = useState<Restaurant[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await api<Restaurant[]>('/api/admin/restaurants', { token }));
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
    setSaving(true);
    try {
      await api('/api/admin/restaurants', { body: { ...form, dueDate: new Date(form.dueDate).toISOString() }, token });
      setForm(EMPTY);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? 'Já existe um restaurante ou usuário com esse nome.' : 'Confira os campos e tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof EMPTY, label: string, type = 'text', hint?: string) => (
    <Field label={label} hint={hint}><input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required /></Field>
  );

  return (
    <>
      <PageHeader title="Restaurantes" actions={<Button onClick={() => { setError(null); setOpen(true); }}><Plus size={17} /> Novo restaurante</Button>} />
      {failed && <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar os restaurantes.</ErrorState>}
      {!list && !failed && <SkeletonCards count={3} />}
      {list?.length === 0 && <EmptyState icon={Building2} title="Nenhum restaurante ainda" action={<Button onClick={() => setOpen(true)}>Cadastrar restaurante</Button>}>O administrador do restaurante é criado junto com o cadastro.</EmptyState>}
      {list && list.length > 0 && (
        <DataTable
          rows={list}
          rowKey={(r) => r.id}
          onRowClick={(r) => router.push(`/admin/restaurants/${r.id}`)}
          columns={[
            { key: 'n', header: 'Restaurante', cell: (r) => <span className="font-semibold">{r.name}</span> },
            { key: 's', header: 'Link', cell: (r) => <span className="text-muted">/{r.slug}</span> },
            { key: 'd', header: 'Vencimento', cell: (r) => new Date(r.dueDate).toLocaleDateString('pt-BR') },
            { key: 'st', header: 'Situação', align: 'right', cell: (r) => { const s = STATE[accessState(new Date(r.dueDate), new Date(), r.suspended)]; return <Badge tone={s.tone} dot>{s.label}</Badge>; } },
          ]}
        />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Novo restaurante" sheet>
        <form onSubmit={create} className="space-y-4">
          {field('name', 'Nome do restaurante')}
          <div className="grid gap-4 sm:grid-cols-2">
            {field('managerName', 'Nome do gerente')}
            {field('managerContact', 'Contato do gerente')}
          </div>
          {field('dueDate', 'Primeiro vencimento', 'date')}
          <div className="grid gap-4 sm:grid-cols-2">
            {field('adminUsername', 'Usuário do administrador', 'text', 'Minúsculas, sem espaços.')}
            {field('adminPassword', 'Senha do administrador', 'password', 'Pelo menos 8 caracteres.')}
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit" loading={saving}>Cadastrar</Button></div>
        </form>
      </Modal>
    </>
  );
}

export default function RestaurantsPage() {
  return (
    <Shell>
      <View />
    </Shell>
  );
}
