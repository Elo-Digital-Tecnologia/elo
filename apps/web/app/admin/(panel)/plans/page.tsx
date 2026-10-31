'use client';

import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import { BILLING_LIMITS, cycleLabel, FIELD_RULES, formatBRL, parseCents, type PlanView } from '@elo/core';
import { Badge, Button, ConfirmModal, DataTable, EmptyState, ErrorState, Field, Input, Modal, MoneyInput, PageHeader, SkeletonCards } from '@elo/ui';
import { money, rule, unexpected, useForm } from '../../../_lib/use-form';
import { useAdmin } from '../../_components/shell';

const EMPTY = { name: '', price: '', cycleMonths: '1', active: true };
type Form = typeof EMPTY;

const CHECKS = { name: rule(FIELD_RULES.planName), price: money(FIELD_RULES.planPriceCents) };

const toForm = (p: PlanView): Form => ({ name: p.name, price: (p.priceCents / 100).toFixed(2).replace('.', ','), cycleMonths: String(p.cycleMonths), active: p.active });

function View() {
  const { token, can } = useAdmin();
  const manage = can('plans.manage');
  const [plans, setPlans] = useState<PlanView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<PlanView | 'new' | null>(null);
  const form = useForm<Form>(EMPTY, CHECKS);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<PlanView | null>(null);

  const load = useCallback(async () => {
    try {
      setPlans(await api<PlanView[]>('/api/admin/plans', { token }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);

  const open = (p: PlanView | 'new') => {
    setError(null);
    form.reset(p === 'new' ? EMPTY : toForm(p));
    setEditing(p);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.validate()) return;
    const v = form.values;
    setSaving(true);
    try {
      const body = { name: v.name, priceCents: parseCents(v.price), cycleMonths: Number(v.cycleMonths), active: v.active };
      if (editing === 'new') await api('/api/admin/plans', { body, token });
      else if (editing) await api(`/api/admin/plans/${editing.id}`, { method: 'PATCH', body, token });
      setEditing(null);
      await load();
    } catch (err) {
      if (!form.fromServer(err, { priceCents: 'price' })) setError(unexpected(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/admin/plans/${removing.id}`, { method: 'DELETE', token });
      setRemoving(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'plan_in_use' ? 'Há restaurantes neste plano. Desative-o em vez de excluir.' : 'Não foi possível excluir.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Planos"
        description="O valor e o ciclo de cada plano definem quanto cobrar e até quando cada pagamento vale."
        actions={manage && <Button onClick={() => open('new')}><Plus size={17} /> Novo plano</Button>}
      />
      {failed && <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar os planos.</ErrorState>}
      {!plans && !failed && <SkeletonCards count={2} />}
      {plans?.length === 0 && (
        <EmptyState icon={Layers} title="Nenhum plano ainda" action={manage && <Button onClick={() => open('new')}>Criar plano</Button>}>
          Crie um plano antes de cadastrar restaurantes.
        </EmptyState>
      )}
      {plans && plans.length > 0 && (
        <DataTable
          rows={plans}
          rowKey={(p) => p.id}
          mobile="cards"
          columns={[
            { key: 'n', header: 'Plano', mobile: 'title', cell: (p) => <span className="font-semibold">{p.name}</span> },
            { key: 'v', header: 'Valor', cell: (p) => <span className="tabular-nums">{formatBRL(p.priceCents)} <span className="text-muted">· {cycleLabel(p.cycleMonths)}</span></span> },
            { key: 'r', header: 'Restaurantes', cell: (p) => <span className="tabular-nums">{p.restaurants}</span> },
            { key: 's', header: 'Situação', cell: (p) => <Badge tone={p.active ? 'success' : 'neutral'} dot>{p.active ? 'Ativo' : 'Desativado'}</Badge> },
            {
              key: 'a',
              header: '',
              align: 'right',
              mobile: 'actions',
              cell: (p) =>
                manage && (
                  <span className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => open(p)} aria-label={`Editar ${p.name}`}><Pencil size={15} /> <span className="hidden sm:inline">Editar</span></Button>
                    {p.restaurants === 0 && (
                      <Button variant="ghost" onClick={() => { setError(null); setRemoving(p); }} aria-label={`Excluir ${p.name}`}><Trash2 size={15} /></Button>
                    )}
                  </span>
                ),
            },
          ]}
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo plano' : 'Editar plano'} sheet>
        <form onSubmit={save} noValidate className="space-y-4">
          <Field label="Nome" error={form.errors.name}><Input {...form.bind('name')} maxLength={FIELD_RULES.planName.max} autoFocus /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor por ciclo" hint="Por exemplo 99,90." error={form.errors.price}><MoneyInput {...form.bind('price')} /></Field>
            <Field label="Ciclo">
              <select value={form.values.cycleMonths} onChange={(e) => form.set('cycleMonths', e.target.value)}>
                {Array.from({ length: BILLING_LIMITS.cycleMonthsMax }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m === 1 ? '1 mês' : `${m} meses`}</option>
                ))}
              </select>
            </Field>
          </div>
          {editing !== 'new' && (
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={form.values.active} onChange={(e) => form.set('active', e.target.checked)} />
              Disponível para novos restaurantes
            </label>
          )}
          {editing !== 'new' && <p className="text-xs text-muted">Mudar o valor vale para os próximos pagamentos. Os já registrados continuam como foram cobrados.</p>}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end"><Button type="submit" loading={saving}>Salvar</Button></div>
        </form>
      </Modal>

      <ConfirmModal open={!!removing} title={`Excluir ${removing?.name ?? ''}?`} confirmLabel="Excluir" danger loading={saving} error={error} onConfirm={remove} onClose={() => setRemoving(null)}>
        <p>O plano some da lista. Nenhum restaurante usa este plano.</p>
      </ConfirmModal>
    </>
  );
}

export default function PlansPage() {
  return <View />;
}
