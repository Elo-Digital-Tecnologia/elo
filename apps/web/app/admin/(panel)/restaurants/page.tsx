'use client';

import { ArchiveRestore, Building2, Download, ExternalLink, Plus, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { cycleLabel, FIELD_RULES, formatBRL, type PlanView, type RestaurantListItem, type RestaurantListStatus, type RestaurantListView } from '@elo/core';
import { Badge, Button, ConfirmModal, DataTable, DateInput, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, PasswordInput, Select, SkeletonCards } from '@elo/ui';
import { rule, unexpected, useForm } from '../../../_lib/use-form';
import { useAdmin } from '../../_components/shell';
import { downloadExport } from './export';

const STATE = { active: { label: 'Ativa', tone: 'success' }, grace: { label: 'Em tolerância', tone: 'warning' }, suspended: { label: 'Suspensa', tone: 'danger' } } as const;
const TRIAL_DAYS = 14;
const EMPTY = { name: '', managerName: '', managerContact: '', planId: '', initialDueDate: '', adminUsername: '', adminPassword: '' };
const dayFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const PAGE_SIZE = 10;
const REQUIRED = { code: 'required' } as const;

const CHECKS = {
  name: rule(FIELD_RULES.restaurantName),
  managerName: rule(FIELD_RULES.personName),
  managerContact: rule(FIELD_RULES.contact),
  adminUsername: rule(FIELD_RULES.username),
  adminPassword: rule(FIELD_RULES.password),
  planId: (v: string) => (v ? null : REQUIRED),
  initialDueDate: (v: string) => (v ? null : REQUIRED),
};

/** The link comes from the name (there is no link field), so link conflicts land under the name. */
const FIELD_MESSAGES: Record<string, string> = {
  slug_taken: 'Já existe um restaurante com esse link; mude o nome.',
  slug_reserved: 'Esse nome gera um link reservado do sistema; mude o nome.',
  invalid_slug: 'Esse nome não gera um link válido; use letras ou números.',
  username_taken: 'Esse usuário já existe.',
};

const CREATE_ERRORS: Record<string, string> = {
  plan_inactive: 'Este plano foi desativado. Escolha outro.',
  plan_not_found: 'Este plano não existe mais. Escolha outro.',
};
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
  const form = useForm(EMPTY, CHECKS, FIELD_MESSAGES);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<RestaurantListItem | null>(null);
  const [plans, setPlans] = useState<PlanView[] | null>(null);
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

  /** The form starts on the first active plan and a two-week trial. */
  const openCreate = async () => {
    setError(null);
    setOpen(true);
    try {
      const list = (await api<PlanView[]>('/api/admin/plans', { token })).filter((p) => p.active);
      setPlans(list);
      form.setValues((f) => ({ ...f, planId: f.planId || list[0]?.id || '', initialDueDate: f.initialDueDate || dayFromNow(TRIAL_DAYS) }));
    } catch {
      setPlans([]);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.validate()) return;
    setSaving(true);
    try {
      await api('/api/admin/restaurants', { body: form.values, token });
      form.reset(EMPTY);
      setOpen(false);
      await load();
    } catch (err) {
      if (!form.fromServer(err, { slug: 'name', username: 'adminUsername' })) setError((err instanceof ApiError && CREATE_ERRORS[err.code]) || unexpected(err));
    } finally {
      setSaving(false);
    }
  };

  const restore = async () => {
    if (!restoring) return;
    setBusyId(restoring.id);
    try {
      await api(`/api/admin/restaurants/${restoring.id}/restore`, { body: {}, token });
      setRestoring(null);
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

  const counts = data?.counts;
  const chips: [RestaurantListStatus | '', string, number | undefined][] = [
    ['', 'Todos', counts?.all],
    ['active', 'Ativos', counts?.active],
    ['grace', 'Em tolerância', counts?.grace],
    ['suspended', 'Suspensos', counts?.suspended],
    ...(canDelete ? [['deleted', 'Excluídos', counts?.deleted] as [RestaurantListStatus, string, number | undefined]] : []),
  ];
  const filtered = !!(filters.q || filters.status || filters.dueSoon);

  const status = (r: RestaurantListItem) => {
    const s = STATE[r.subscription.state];
    return <Badge tone={s.tone} dot>{s.label}</Badge>;
  };
  /** Opens the public menu without leaving the list. */
  const menuLink = (r: RestaurantListItem) => (
    <a href={`/${r.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label={`Abrir o cardápio de ${r.name}`} title="Abrir cardápio" className="grid h-9 w-9 shrink-0 place-items-center rounded-pill text-muted transition hover:bg-brand/10 hover:text-brand">
      <ExternalLink size={16} />
    </a>
  );
  const deletedActions = (r: RestaurantListItem) => (
    <span className="flex flex-wrap justify-end gap-1">
      <Button variant="ghost" disabled={busyId === r.id} onClick={() => setRestoring(r)}><ArchiveRestore size={15} /> Restaurar</Button>
      <Button variant="ghost" disabled={busyId === r.id} onClick={() => exportData(r)}><Download size={15} /> Exportar</Button>
    </span>
  );

  return (
    <>
      <PageHeader title="Restaurantes" actions={can('restaurants.create') && <Button onClick={openCreate}><Plus size={17} /> Novo restaurante</Button>} />

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Input icon={<Search size={17} />} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, link ou responsável" aria-label="Buscar restaurantes" />
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
          <EmptyState icon={Building2} title="Nenhum restaurante ainda" action={can('restaurants.create') && <Button onClick={openCreate}>Cadastrar restaurante</Button>}>O titular do restaurante é criado junto com o cadastro.</EmptyState>
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
                      { key: 'g', header: 'Responsável', cell: (r) => <span className="block truncate text-muted">{r.managerName}</span> },
                      { key: 'd', header: 'Vencimento', cell: (r) => <span className="tabular-nums">{day(r.dueDate)}</span> },
                      { key: 'st', header: 'Situação', align: 'right', cell: status },
                      { key: 'm', header: '', align: 'right', cell: menuLink },
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
                  <div className="surface flex items-center gap-1 p-2 pl-4">
                    <button onClick={() => router.push(`/admin/restaurants/${r.id}`)} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2 text-left">
                      <span className="min-w-0">
                        <strong className="block truncate">{r.name}</strong>
                        <span className="block truncate text-xs text-muted">/{r.slug} · vence {day(r.dueDate)}</span>
                      </span>
                      {status(r)}
                    </button>
                    {menuLink(r)}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination className="mt-4" page={data.page} pageSize={data.pageSize} total={data.total} onPage={(page) => setFilters({ page })} />
        </>
      )}

      <ConfirmModal open={!!restoring} title={`Restaurar ${restoring?.name ?? ''}?`} confirmLabel="Restaurar" loading={busyId === restoring?.id} onConfirm={restore} onClose={() => setRestoring(null)}>
        <p>O restaurante volta para a lista como <strong>suspenso</strong>: o cardápio volta ao ar, mas a equipe continua sem acesso até você reativar.</p>
      </ConfirmModal>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo restaurante" sheet>
        <form onSubmit={create} noValidate className="space-y-4">
          <Field label="Nome do restaurante" error={form.errors.name}><Input {...form.bind('name')} maxLength={FIELD_RULES.restaurantName.max} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Responsável pelo contrato" hint="Também vira o titular do painel do restaurante." error={form.errors.managerName}><Input {...form.bind('managerName')} maxLength={FIELD_RULES.personName.max} /></Field>
            <Field label="Contato do responsável" hint="Telefone com DDD ou e-mail." error={form.errors.managerContact}><Input {...form.bind('managerContact')} maxLength={FIELD_RULES.contact.max} /></Field>
          </div>
          {plans?.length === 0 ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">Nenhum plano ativo. Crie um plano em <a href="/admin/plans" className="font-semibold underline">Planos</a> antes de cadastrar.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Plano" error={form.errors.planId}>
                <Select name="planId" value={form.values.planId} onChange={(e) => form.set('planId', e.target.value)} onBlur={() => form.touch('planId')} invalid={!!form.errors.planId}>
                  {(plans ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} · {formatBRL(p.priceCents)} {cycleLabel(p.cycleMonths)}</option>)}
                </Select>
              </Field>
              <Field label="Fim do teste" hint="Primeiro vencimento. O padrão é daqui a 14 dias." error={form.errors.initialDueDate}>
                <DateInput value={form.values.initialDueDate} min={dayFromNow(0)} onChange={(v) => form.set('initialDueDate', v)} invalid={!!form.errors.initialDueDate} required />
              </Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Usuário do titular" hint="Minúsculas, números, ponto, hífen ou sublinhado." error={form.errors.adminUsername}>
              <Input {...form.bind('adminUsername')} onChange={(e) => form.set('adminUsername', e.target.value.toLowerCase())} maxLength={FIELD_RULES.username.max} autoCapitalize="none" autoComplete="off" />
            </Field>
            <Field label="Senha do titular" hint="Pelo menos 8 caracteres." error={form.errors.adminPassword}>
              <PasswordInput {...form.bind('adminPassword')} maxLength={FIELD_RULES.password.max} autoComplete="new-password" />
            </Field>
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit" loading={saving} disabled={!form.values.planId}>Cadastrar</Button></div>
        </form>
      </Modal>
    </>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense fallback={<SkeletonCards count={3} />}>
      <View />
    </Suspense>
  );
}
