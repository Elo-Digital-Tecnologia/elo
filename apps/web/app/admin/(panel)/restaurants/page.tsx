'use client';

import { ArchiveRestore, Building2, Download, ExternalLink, Paperclip, Plus, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, apiUpload } from '@elo/client';
import { addYears, type ContractProblem, cycleLabel, DOCUMENT_LIMITS, type DocumentView, FIELD_RULES, fieldError, formatBRL, type PlanView, type RestaurantListItem, type RestaurantListStatus, type RestaurantListView } from '@elo/core';
import { Badge, Button, ConfirmModal, DataTable, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, PasswordInput, Select, SkeletonCards } from '@elo/ui';
import { rule, unexpected, useForm } from '../../../_lib/use-form';
import { useAdmin } from '../../_components/shell';
import { CONTRACT_PROBLEM, contractChecks, ContractFields, type ContractFormState } from './[id]/_components/contracts';
import { fileSize } from './[id]/_components/documents';
import { downloadExport } from './export';

const STATE = { active: { label: 'Ativa', tone: 'success' }, grace: { label: 'Em tolerância', tone: 'warning' }, suspended: { label: 'Suspensa', tone: 'danger' } } as const;
const TRIAL_SHORTCUTS = [0, 7, 14, 30];
const EMPTY = { name: '', managerName: '', managerContact: '', planId: '', trialDays: '14', adminUsername: '', adminPassword: '' };
const today = () => new Date().toLocaleDateString('sv-SE');
const yearFrom = (start: string) => new Date(Date.parse(`${addYears(start, 1)}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
const EMPTY_CONTRACT: ContractFormState = { kind: 'pilot', signedOn: '', startsOn: '', endsOn: '', name: '', role: '', contact: '', document: null };
const PAGE_SIZE = 10;
const REQUIRED = { code: 'required' } as const;

const CHECKS = {
  name: rule(FIELD_RULES.restaurantName),
  managerName: rule(FIELD_RULES.personName),
  managerContact: rule(FIELD_RULES.contact),
  adminUsername: rule(FIELD_RULES.username),
  adminPassword: rule(FIELD_RULES.password),
  planId: (v: string) => (v ? null : REQUIRED),
  trialDays: (v: string) => fieldError(FIELD_RULES.trialDays, v.trim() === '' ? undefined : Number(v)),
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

/** Steps after the restaurant exists; a failure leaves it created and Pendente. */
const CONTRACT_STEP_ERRORS: Record<string, string> = {
  unsupported_document: 'O arquivo não é um PDF ou uma foto aceita.',
  file_too_large: 'O arquivo passa de 10 MB.',
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
  const [withContract, setWithContract] = useState(false);
  const contract = useForm<ContractFormState>(EMPTY_CONTRACT, contractChecks);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [created, setCreated] = useState<{ id: string; name: string; problem: string } | null>(null);
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
      form.setValues((f) => ({ ...f, planId: f.planId || list[0]?.id || '' }));
    } catch {
      setPlans([]);
    }
  };

  /** Turns the optional contract section on, prefilled with the manager as the signatory. */
  const toggleContract = (on: boolean) => {
    setWithContract(on);
    if (!on) return;
    const start = today();
    contract.reset({ ...EMPTY_CONTRACT, signedOn: start, startsOn: start, endsOn: yearFrom(start), name: form.values.managerName, contact: form.values.managerContact });
    setContractFile(null);
    setFileError(null);
  };

  const pickFile = (file: File) => {
    setFileError(null);
    if (file.size > DOCUMENT_LIMITS.maxBytes) return setFileError('O arquivo pode ter até 10 MB.');
    if (!(DOCUMENT_LIMITS.types as readonly string[]).includes(file.type)) return setFileError('Envie um PDF ou uma foto (JPG, PNG ou WebP).');
    setContractFile(file);
  };

  /** Sends the signed file and registers the first contract of a restaurant just created. */
  const registerContract = async (id: string) => {
    const v = contract.values;
    const doc = await apiUpload<DocumentView>(`/api/admin/restaurants/${id}/documents`, contractFile!, token, { kind: 'contract' });
    await api(`/api/admin/restaurants/${id}/contracts`, {
      body: { kind: v.kind, origin: 'initial', signedOn: v.signedOn, startsOn: v.startsOn, endsOn: v.endsOn, signatory: { name: v.name, role: v.role, contact: v.contact }, documentId: doc.id },
      token,
    });
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const okRestaurant = form.validate();
    const okContract = !withContract || contract.validate();
    if (withContract && !contractFile) setFileError('Escolha o arquivo do contrato assinado.');
    if (!okRestaurant || !okContract || (withContract && !contractFile)) return;
    setSaving(true);
    let restaurant: { id: string; name: string } | null = null;
    try {
      restaurant = await api<{ id: string; name: string }>('/api/admin/restaurants', { body: { ...form.values, trialDays: Number(form.values.trialDays) }, token });
      if (withContract) await registerContract(restaurant.id);
      form.reset(EMPTY);
      setWithContract(false);
      setOpen(false);
      await load();
    } catch (err) {
      if (restaurant) {
        const problems = err instanceof ApiError && Array.isArray(err.data.problems) ? (err.data.problems as ContractProblem[]) : [];
        const problem = problems.length ? problems.map((p) => CONTRACT_PROBLEM[p]).join(' ') : (err instanceof ApiError && CONTRACT_STEP_ERRORS[err.code]) || unexpected(err);
        form.reset(EMPTY);
        setWithContract(false);
        setOpen(false);
        setCreated({ ...restaurant, problem });
        await load();
      } else if (!form.fromServer(err, { slug: 'name', username: 'adminUsername' })) setError((err instanceof ApiError && CREATE_ERRORS[err.code]) || unexpected(err));
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
    ['pending', 'Pendentes', counts?.pending],
    ...(canDelete ? [['deleted', 'Excluídos', counts?.deleted] as [RestaurantListStatus, string, number | undefined]] : []),
  ];
  const filtered = !!(filters.q || filters.status || filters.dueSoon);

  const status = (r: RestaurantListItem) => {
    const s = STATE[r.subscription.state];
    const contractState = r.subscription.contract.state;
    return (
      <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
        {contractState === 'pending' ? <Badge tone="danger" dot>Pendente</Badge> : contractState === 'ended' ? <Badge tone="danger" dot>Contrato encerrado</Badge> : <Badge tone={s.tone} dot>{s.label}</Badge>}
        {r.subscription.trialEndsAt && <Badge tone="info">Em teste</Badge>}
      </span>
    );
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
              <Field label="Período de teste (dias)" hint="Conta a partir do início do primeiro contrato. 0 = sem teste." error={form.errors.trialDays}>
                <Input {...form.bind('trialDays')} inputMode="numeric" maxLength={2} onChange={(e) => form.set('trialDays', e.target.value.replace(/\D/g, ''))} />
                <span className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Atalhos do período de teste">
                  {TRIAL_SHORTCUTS.map((d) => {
                    const on = form.values.trialDays === String(d);
                    return (
                      <button key={d} type="button" aria-pressed={on} onClick={() => form.set('trialDays', String(d))} className={`rounded-pill border px-3 py-1 text-xs font-medium transition ${on ? 'border-brand bg-brand text-brand-fg' : 'border-line/60 text-muted hover:text-fg'}`}>
                        {d === 0 ? 'Sem teste' : `${d} dias`}
                      </button>
                    );
                  })}
                </span>
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
          <fieldset className="space-y-4 rounded-md border border-line/50 p-4">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={withContract} onChange={(e) => toggleContract(e.target.checked)} className="mt-0.5 !w-auto" />
              <span>
                <span className="block font-medium">Anexar o contrato assinado agora</span>
                <span className="block text-muted">Sem contrato, o restaurante fica Pendente: a equipe não acessa o painel e o cardápio fica fora do ar até o contrato ser registrado.</span>
              </span>
            </label>
            {withContract && (
              <>
                <ContractFields form={contract} />
                <Field label="Contrato assinado" error={fileError ?? undefined}>
                  <div className="space-y-1.5">
                    {contractFile ? (
                      <div className="surface flex items-center gap-3 px-3.5 py-2.5 text-sm">
                        <Paperclip size={16} className="shrink-0 text-brand" />
                        <span className="min-w-0 flex-1 truncate font-medium">{contractFile.name}</span>
                        <span className="shrink-0 text-muted">{fileSize(contractFile.size)}</span>
                        <button type="button" onClick={() => setContractFile(null)} aria-label="Tirar o arquivo" className="grid h-8 w-8 shrink-0 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <Button type="button" variant="ghost" onClick={() => fileInput.current?.click()} className={fileError ? '!border-danger' : ''}>Escolher arquivo</Button>
                    )}
                    <p className="text-xs text-muted">PDF, JPG, PNG ou WebP, até 10 MB. É enviado depois do cadastro.</p>
                    <input
                      ref={fileInput}
                      type="file"
                      accept={DOCUMENT_LIMITS.types.join(',')}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) pickFile(file);
                      }}
                    />
                  </div>
                </Field>
              </>
            )}
          </fieldset>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit" loading={saving} disabled={!form.values.planId}>Cadastrar</Button></div>
        </form>
      </Modal>

      <Modal open={!!created} onClose={() => setCreated(null)} title="Restaurante cadastrado como Pendente" sheet>
        <p className="text-sm">
          <strong>{created?.name}</strong> foi cadastrado, mas o contrato não foi registrado: {created?.problem} Enquanto isso, ele fica Pendente. Registre o contrato na página do restaurante.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCreated(null)}>Fechar</Button>
          <Button onClick={() => created && router.push(`/admin/restaurants/${created.id}`)}>Abrir restaurante</Button>
        </div>
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
