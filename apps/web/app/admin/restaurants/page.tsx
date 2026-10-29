'use client';

import { ArchiveRestore, Building2, ChevronLeft, ChevronRight, Download, Plus, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import type { RestaurantListItem, RestaurantListStatus, RestaurantListView } from '@elo/core';
import { Badge, Button, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, SkeletonCards } from '@elo/ui';
import { Shell, useAdmin } from '../_components/shell';
import { downloadExport } from './export';

const STATE = { active: { label: 'Ativa', tone: 'success' }, grace: { label: 'Em tolerância', tone: 'warning' }, suspended: { label: 'Suspensa', tone: 'danger' } } as const;
const EMPTY = { name: '', managerName: '', managerContact: '', dueDate: '', adminUsername: '', adminPassword: '' };
const PAGE_SIZE = 20;
const SORTS = [
  ['name', 'Nome'],
  ['due', 'Vencimento mais próximo'],
  ['created', 'Mais recentes'],
] as const;

const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

type Filters = { q: string; status: RestaurantListStatus | ''; dueSoon: boolean; sort: string; page: number };

const readFilters = (params: URLSearchParams): Filters => ({
  q: params.get('q') ?? '',
  status: (params.get('status') ?? '') as RestaurantListStatus | '',
  dueSoon: params.get('due') === '7',
  sort: params.get('sort') ?? 'name',
  page: Math.max(1, Number(params.get('page')) || 1),
});

/** Filters live in the URL: reloads, the back button and shared links keep them. */
function useFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const filters = readFilters(new URLSearchParams(params.toString()));
  const set = useCallback(
    (next: Partial<Filters>) => {
      const merged = { ...readFilters(new URLSearchParams(params.toString())), page: 1, ...next };
      const qs = new URLSearchParams();
      if (merged.q) qs.set('q', merged.q);
      if (merged.status) qs.set('status', merged.status);
      if (merged.dueSoon) qs.set('due', '7');
      if (merged.sort !== 'name') qs.set('sort', merged.sort);
      if (merged.page > 1) qs.set('page', String(merged.page));
      router.replace(qs.size ? `${path}?${qs}` : path, { scroll: false });
    },
    [params, path, router],
  );
  return [filters, set] as const;
}

function View() {
  const { token, can } = useAdmin();
  const router = useRouter();
  const [filters, setFilters] = useFilters();
  const [search, setSearch] = useState(filters.q);
  const [data, setData] = useState<RestaurantListView | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const canDelete = can('restaurants.delete');
  const deletedView = filters.status === 'deleted';

  const query = new URLSearchParams({ page: String(filters.page), pageSize: String(PAGE_SIZE), sort: filters.sort });
  if (filters.q) query.set('q', filters.q);
  if (filters.status) query.set('status', filters.status);
  if (filters.dueSoon) query.set('dueWithin', '7');
  const qs = query.toString();

  const load = useCallback(async () => {
    try {
      setData(await api<RestaurantListView>(`/api/admin/restaurants?${qs}`, { token }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [token, qs]);
  useEffect(() => {
    void load();
  }, [load]);

  // Typing settles for a moment before it becomes a search.
  useEffect(() => {
    if (search.trim() === filters.q) return;
    const t = setTimeout(() => setFilters({ q: search.trim() }), 350);
    return () => clearTimeout(t);
  }, [search, filters.q, setFilters]);

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

  const restore = async (r: RestaurantListItem) => {
    setBusyId(r.id);
    try {
      await api(`/api/admin/restaurants/${r.id}/restore`, { body: {}, token });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const exportData = async (r: RestaurantListItem) => {
    setBusyId(r.id);
    try {
      await downloadExport(r.id, r.slug, token);
    } finally {
      setBusyId(null);
    }
  };

  const field = (key: keyof typeof EMPTY, label: string, type = 'text', hint?: string) => (
    <Field label={label} hint={hint}><input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required /></Field>
  );

  const counts = data?.counts;
  const chips: [RestaurantListStatus | '', string, number | undefined][] = [
    ['', 'Todos', counts?.all],
    ['active', 'Ativos', counts?.active],
    ['grace', 'Em tolerância', counts?.grace],
    ['suspended', 'Suspensos', counts?.suspended],
    ...(canDelete ? [['deleted', 'Excluídos', counts?.deleted] as [RestaurantListStatus, string, number | undefined]] : []),
  ];
  const first = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtered = !!(filters.q || filters.status || filters.dueSoon);

  const status = (r: RestaurantListItem) => {
    const s = STATE[r.subscription.state];
    return <Badge tone={s.tone} dot>{s.label}</Badge>;
  };
  const deletedActions = (r: RestaurantListItem) => (
    <span className="flex flex-wrap justify-end gap-1">
      <Button variant="ghost" disabled={busyId === r.id} onClick={() => restore(r)}><ArchiveRestore size={15} /> Restaurar</Button>
      <Button variant="ghost" disabled={busyId === r.id} onClick={() => exportData(r)}><Download size={15} /> Exportar</Button>
    </span>
  );

  return (
    <>
      <PageHeader title="Restaurantes" actions={can('restaurants.create') && <Button onClick={() => { setError(null); setOpen(true); }}><Plus size={17} /> Novo restaurante</Button>} />

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Input icon={<Search size={17} />} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, link ou gerente" aria-label="Buscar restaurantes" />
          </div>
          <select value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value })} aria-label="Ordenar" className="sm:!w-56">
            {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scroll-soft sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Situação">
          {chips.map(([key, label, n]) => {
            const on = filters.status === key;
            return (
              <button key={key || 'all'} aria-pressed={on} onClick={() => setFilters({ status: key, dueSoon: key === 'deleted' ? false : filters.dueSoon })} className={`flex shrink-0 items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition ${on ? 'border-brand bg-brand text-brand-fg' : 'border-line/60 text-muted hover:border-brand/60 hover:text-fg'}`}>
                {label}
                {n !== undefined && <span className={`tabular-nums ${on ? 'opacity-90' : 'text-muted'}`}>{n}</span>}
              </button>
            );
          })}
          {!deletedView && (
            <button aria-pressed={filters.dueSoon} onClick={() => setFilters({ dueSoon: !filters.dueSoon })} className={`shrink-0 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition ${filters.dueSoon ? 'border-warning bg-warning/15 text-warning' : 'border-dashed border-line/60 text-muted hover:text-fg'}`}>
              Vence em 7 dias
            </button>
          )}
        </div>
      </div>

      {failed && <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar os restaurantes.</ErrorState>}
      {!data && !failed && <SkeletonCards count={3} />}
      {data && data.total === 0 && (
        filtered ? (
          <EmptyState icon={Search} title="Nada encontrado" action={<Button variant="ghost" onClick={() => { setSearch(''); setFilters({ q: '', status: '', dueSoon: false }); }}>Limpar filtros</Button>}>Nenhum restaurante com esses filtros.</EmptyState>
        ) : (
          <EmptyState icon={Building2} title="Nenhum restaurante ainda" action={can('restaurants.create') && <Button onClick={() => setOpen(true)}>Cadastrar restaurante</Button>}>O administrador do restaurante é criado junto com o cadastro.</EmptyState>
        )
      )}

      {data && data.total > 0 && (
        <>
          {deletedView && <p className="mb-3 text-sm text-muted">Restaurantes excluídos ficam guardados até a data de remoção e depois são apagados de vez. Restaurar devolve o restaurante como suspenso.</p>}
          <div className="hidden md:block">
            <DataTable
              rows={data.items}
              rowKey={(r) => r.id}
              onRowClick={deletedView ? undefined : (r) => router.push(`/admin/restaurants/${r.id}`)}
              columns={
                deletedView
                  ? [
                      { key: 'n', header: 'Restaurante', cell: (r) => <span className="block min-w-0"><span className="block truncate font-semibold">{r.name}</span><span className="text-xs text-muted">/{r.slug}</span></span> },
                      { key: 'x', header: 'Excluído em', cell: (r) => day(r.deletedAt!) },
                      { key: 'p', header: 'Remoção definitiva', cell: (r) => <span className="font-medium text-danger">{day(r.purgeAt!)}</span> },
                      { key: 'a', header: '', align: 'right', cell: deletedActions },
                    ]
                  : [
                      { key: 'n', header: 'Restaurante', cell: (r) => <span className="block min-w-0"><span className="block truncate font-semibold">{r.name}</span><span className="text-xs text-muted">/{r.slug}</span></span> },
                      { key: 'g', header: 'Gerente', cell: (r) => <span className="block truncate text-muted">{r.managerName}</span> },
                      { key: 'd', header: 'Vencimento', cell: (r) => <span className="tabular-nums">{day(r.dueDate)}</span> },
                      { key: 'st', header: 'Situação', align: 'right', cell: status },
                    ]
              }
            />
          </div>
          <ul className="space-y-2 md:hidden">
            {data.items.map((r) => (
              <li key={r.id}>
                {deletedView ? (
                  <div className="surface p-4">
                    <strong className="block truncate">{r.name}</strong>
                    <span className="block text-xs text-muted">Excluído em {day(r.deletedAt!)} · removido de vez em {day(r.purgeAt!)}</span>
                    <div className="mt-2">{deletedActions(r)}</div>
                  </div>
                ) : (
                  <button onClick={() => router.push(`/admin/restaurants/${r.id}`)} className="surface flex w-full items-center justify-between gap-3 p-4 text-left">
                    <span className="min-w-0">
                      <strong className="block truncate">{r.name}</strong>
                      <span className="block truncate text-xs text-muted">/{r.slug} · vence {day(r.dueDate)}</span>
                    </span>
                    {status(r)}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <nav className="mt-4 flex items-center justify-between gap-3 text-sm text-muted" aria-label="Páginas">
            <span className="tabular-nums">{first}–{last} de {data.total}</span>
            <span className="flex gap-2">
              <Button variant="ghost" disabled={data.page <= 1} onClick={() => setFilters({ page: data.page - 1 })} aria-label="Página anterior"><ChevronLeft size={16} /> Anterior</Button>
              <Button variant="ghost" disabled={data.page >= pages} onClick={() => setFilters({ page: data.page + 1 })} aria-label="Próxima página">Próxima <ChevronRight size={16} /></Button>
            </span>
          </nav>
        </>
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
      <Suspense fallback={<SkeletonCards count={3} />}>
        <View />
      </Suspense>
    </Shell>
  );
}
