'use client';

import { CalendarCog, Pencil, Undo2, Wallet } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@elo/client';
import {
  BILLING_LIMITS,
  type BillingEntryView,
  cycleLabel,
  formatBRL,
  parseCents,
  type PaymentPreview,
  type PaymentProblem,
  type PlanView,
  type SubscriptionView,
} from '@elo/core';
import { Badge, Button, DataTable, DateInput, EmptyState, Field, Modal } from '@elo/ui';

const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR');
const today = () => new Date().toISOString().slice(0, 10);
const money = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

const PROBLEM: Record<PaymentProblem | 'due_in_past' | 'reason_required', string> = {
  paid_in_future: 'A data do pagamento não pode ser no futuro.',
  paid_before_creation: 'A data do pagamento é anterior ao cadastro do restaurante.',
  cycles_out_of_range: `Escolha de 1 a ${BILLING_LIMITS.cyclesMax} ciclos.`,
  amount_out_of_range: 'Valor fora do esperado para este plano.',
  note_required: 'O valor é diferente do plano: explique na observação (por exemplo, um desconto).',
  note_too_long: `A observação pode ter até ${BILLING_LIMITS.noteMax} caracteres.`,
  due_in_past: 'O vencimento não pode ser antes de hoje.',
  reason_required: 'Informe o motivo.',
};

const CODE: Record<string, string> = {
  no_plan: 'Este restaurante não tem plano. Escolha um plano antes de registrar o pagamento.',
  not_latest_entry: 'Só o lançamento mais recente pode ser estornado.',
  already_voided: 'Este lançamento já foi estornado.',
  plan_inactive: 'Este plano foi desativado. Escolha outro.',
  invalid_date: 'Data inválida.',
};

function explain(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Não foi possível concluir.';
  const problems = e.data.problems as (keyof typeof PROBLEM)[] | undefined;
  if (problems?.length) return problems.map((p) => PROBLEM[p] ?? p).join(' ');
  return CODE[e.code] ?? 'Não foi possível concluir. Confira os campos.';
}

type Dialog = 'pay' | 'adjust' | 'plan' | { edit: BillingEntryView } | { void: BillingEntryView } | null;

/**
 * Billing of one restaurant in the Elo panel: payment form with the period calculated by
 * the server, history with edit and void, manual due date and plan change. Returns the
 * pieces so the page places them; `onChange` reloads whatever shows the due date.
 */
export function useBilling({ id, token, subscription, canRecord, onChange }: { id: string; token: string; subscription: SubscriptionView | null; canRecord: boolean; onChange: () => Promise<void> }) {
  const [entries, setEntries] = useState<BillingEntryView[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pay, setPay] = useState({ cycles: '1', paidAt: today(), amount: '', note: '' });
  const [preview, setPreview] = useState<PaymentPreview | null>(null);
  const expected = useRef<number | null>(null);
  const [edit, setEdit] = useState({ amount: '', paidAt: '', note: '' });
  const [reason, setReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [plans, setPlans] = useState<PlanView[]>([]);
  const [planId, setPlanId] = useState('');

  const load = useCallback(async () => {
    setEntries(await api<BillingEntryView[]>(`/api/admin/restaurants/${id}/payments`, { token }));
  }, [id, token]);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  // The period and the expected amount follow the cycles and the payment day as they are typed.
  useEffect(() => {
    if (dialog !== 'pay' || !pay.paidAt) return;
    let live = true;
    const t = setTimeout(() => {
      api<PaymentPreview>(`/api/admin/restaurants/${id}/payments/preview?cycles=${pay.cycles}&paidAt=${pay.paidAt}`, { token })
        .then((p) => {
          if (!live) return;
          // Keep a typed amount; follow the plan while the field still shows the plan's value.
          const previous = expected.current;
          setPay((f) => (!f.amount || parseCents(f.amount) === previous ? { ...f, amount: money(p.expectedCents) } : f));
          expected.current = p.expectedCents;
          setPreview(p);
          setError(null);
        })
        .catch((e) => live && (setPreview(null), setError(explain(e))));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [dialog, pay.cycles, pay.paidAt, id, token]);

  const run = async (fn: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      await Promise.all([load(), onChange()]);
      setDialog(null);
    } catch (e) {
      setError(explain(e));
    } finally {
      setSaving(false);
    }
  };

  const open = (d: Exclude<Dialog, null>) => {
    setError(null);
    setReason('');
    if (d === 'pay') {
      setPreview(null);
      expected.current = null;
      setPay({ cycles: '1', paidAt: today(), amount: '', note: '' });
    }
    if (d === 'adjust') setDueDate('');
    if (d === 'plan') {
      setPlanId(subscription?.plan?.id ?? '');
      void api<PlanView[]>('/api/admin/plans', { token }).then((list) => setPlans(list.filter((p) => p.active || p.id === subscription?.plan?.id)));
    }
    if (typeof d === 'object' && 'edit' in d) setEdit({ amount: money(d.edit.amountCents), paidAt: d.edit.paidAt.slice(0, 10), note: d.edit.note ?? '' });
    setDialog(d);
  };

  const submitPay = (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = parseCents(pay.amount);
    if (!amountCents) return setError('Informe o valor, por exemplo 99,90.');
    void run(() => api(`/api/admin/restaurants/${id}/payments`, { body: { cycles: Number(pay.cycles), paidAt: pay.paidAt, amountCents, note: pay.note.trim() || undefined }, token }));
  };

  const submitEdit = (e: React.FormEvent, entry: BillingEntryView) => {
    e.preventDefault();
    const amountCents = parseCents(edit.amount);
    if (!amountCents) return setError('Informe o valor, por exemplo 99,90.');
    void run(() => api(`/api/admin/restaurants/${id}/payments/${entry.id}`, { method: 'PATCH', body: { amountCents, paidAt: edit.paidAt, note: edit.note.trim() || null }, token }));
  };

  const latestActive = entries.find((e) => !e.voidedAt);
  const differs = preview && parseCents(pay.amount) !== preview.expectedCents;

  const history =
    entries.length === 0 ? (
      <EmptyState icon={Wallet} title="Nenhum pagamento registrado" action={canRecord && subscription?.plan && <Button onClick={() => open('pay')}>Registrar pagamento</Button>}>
        {subscription?.plan ? 'O vencimento segue o fim do teste até o primeiro pagamento.' : 'Escolha um plano para registrar pagamentos.'}
      </EmptyState>
    ) : (
      <DataTable
        rows={entries}
        rowKey={(p) => p.id}
        mobile="cards"
        columns={[
          {
            key: 'p',
            header: 'Lançamento',
            mobile: 'title',
            cell: (p) => (
              <span className={`block min-w-0 ${p.voidedAt ? 'text-muted line-through' : ''}`}>
                <span className="block font-medium">{p.kind === 'payment' ? `${p.planName ?? 'Pagamento'} · ${p.cycles ?? 1} ${p.cycles === 1 ? 'ciclo' : 'ciclos'}` : 'Vencimento ajustado'}</span>
                <span className="block text-xs text-muted">
                  {p.kind === 'payment' ? `Pago em ${fmt(p.paidAt)} · ` : ''}
                  {p.periodStart ? `${fmt(p.periodStart)} a ${fmt(p.newDueDate)}` : `vence em ${fmt(p.newDueDate)}`}
                </span>
              </span>
            ),
          },
          {
            key: 'v',
            header: 'Valor',
            cell: (p) => (p.kind === 'payment' ? <span className={`font-semibold tabular-nums ${p.voidedAt ? 'text-muted line-through' : ''}`}>{formatBRL(p.amountCents)}</span> : <span className="text-muted">—</span>),
          },
          {
            key: 'n',
            header: 'Observação',
            cell: (p) => (
              <span className="block max-w-64 text-sm text-muted">
                {p.note ?? '—'}
                {p.voidedAt && <span className="block text-danger">Estornado por {p.voidedByName ?? '—'}: {p.voidReason}</span>}
              </span>
            ),
          },
          { key: 'r', header: 'Registrado por', cell: (p) => <span className="text-muted">{p.recordedByName ?? '—'}</span> },
          {
            key: 'a',
            header: '',
            align: 'right',
            mobile: 'actions',
            cell: (p) =>
              p.voidedAt ? (
                <Badge tone="neutral">Estornado</Badge>
              ) : (
                canRecord && (
                  <span className="flex justify-end gap-1">
                    {p.kind === 'payment' && <Button variant="ghost" onClick={() => open({ edit: p })} aria-label="Corrigir lançamento"><Pencil size={15} /></Button>}
                    {p.id === latestActive?.id && <Button variant="ghost" onClick={() => open({ void: p })} aria-label="Estornar lançamento"><Undo2 size={15} /> <span className="hidden sm:inline">Estornar</span></Button>}
                  </span>
                )
              ),
          },
        ]}
      />
    );

  const errorLine = error && <p role="alert" className="text-sm text-danger">{error}</p>;
  const plan = subscription?.plan;

  const modals = (
    <>
      <Modal open={dialog === 'pay'} onClose={() => setDialog(null)} title="Registrar pagamento" sheet>
        <form onSubmit={submitPay} className="space-y-4">
          {plan && <p className="text-sm text-muted">Plano {plan.name}: {formatBRL(plan.priceCents)} {cycleLabel(plan.cycleMonths)}.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ciclos pagos">
              <select value={pay.cycles} onChange={(e) => setPay({ ...pay, cycles: e.target.value })}>
                {Array.from({ length: BILLING_LIMITS.cyclesMax }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Pago em"><DateInput max={today()} value={pay.paidAt} onChange={(v) => setPay({ ...pay, paidAt: v })} required /></Field>
          </div>
          <Field label="Valor recebido" hint={preview ? `Valor do plano: ${formatBRL(preview.expectedCents)}.` : undefined}>
            <input inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} required />
          </Field>
          <Field label={differs ? 'Observação (obrigatória)' : 'Observação'}>
            <input value={pay.note} maxLength={BILLING_LIMITS.noteMax} onChange={(e) => setPay({ ...pay, note: e.target.value })} required={!!differs} placeholder={differs ? 'Por exemplo: desconto de lançamento' : undefined} />
          </Field>
          {preview && (
            <div className="rounded-md border border-brand/30 bg-brand/5 px-4 py-3 text-sm">
              Período de <strong>{fmt(preview.periodStart)}</strong> a <strong>{fmt(preview.newDueDate)}</strong>. Novo vencimento: <strong>{fmt(preview.newDueDate)}</strong>.
              {preview.restartsFromPayment && <span className="mt-1 block text-muted">O restaurante estava suspenso por atraso, então o período começa na data do pagamento.</span>}
            </div>
          )}
          {errorLine}
          <div className="flex justify-end"><Button type="submit" loading={saving} disabled={!preview}>Registrar</Button></div>
        </form>
      </Modal>

      <Modal open={!!dialog && typeof dialog === 'object' && 'edit' in dialog} onClose={() => setDialog(null)} title="Corrigir pagamento" sheet>
        {dialog && typeof dialog === 'object' && 'edit' in dialog && (
          <form onSubmit={(e) => submitEdit(e, dialog.edit)} className="space-y-4">
            <p className="text-sm text-muted">O período ({dialog.edit.periodStart ? `${fmt(dialog.edit.periodStart)} a ` : ''}{fmt(dialog.edit.newDueDate)}) não muda. Para mudar o período, estorne e registre de novo.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor recebido"><input inputMode="decimal" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} required /></Field>
              <Field label="Pago em"><DateInput max={today()} value={edit.paidAt} onChange={(v) => setEdit({ ...edit, paidAt: v })} required /></Field>
            </div>
            <Field label="Observação"><input value={edit.note} maxLength={BILLING_LIMITS.noteMax} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
            {errorLine}
            <div className="flex justify-end"><Button type="submit" loading={saving}>Salvar</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!dialog && typeof dialog === 'object' && 'void' in dialog} onClose={() => setDialog(null)} title="Estornar lançamento" sheet>
        {dialog && typeof dialog === 'object' && 'void' in dialog && (
          <form onSubmit={(e) => { e.preventDefault(); void run(() => api(`/api/admin/restaurants/${id}/payments/${dialog.void.id}/void`, { body: { reason }, token })); }} className="space-y-4">
            <p className="text-sm">
              {dialog.void.kind === 'payment' ? `O pagamento de ${formatBRL(dialog.void.amountCents)} fica no histórico, riscado.` : 'O ajuste fica no histórico, riscado.'} O vencimento volta para o do lançamento anterior
              {entries.filter((e) => !e.voidedAt)[1] ? ` (${fmt(entries.filter((e) => !e.voidedAt)[1].newDueDate)})` : ', o fim do teste'}.
            </p>
            <Field label="Motivo"><input value={reason} onChange={(e) => setReason(e.target.value)} minLength={BILLING_LIMITS.reasonMin} maxLength={BILLING_LIMITS.reasonMax} required autoFocus /></Field>
            {errorLine}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>Voltar</Button>
              <Button type="submit" variant="danger" loading={saving}>Estornar</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={dialog === 'adjust'} onClose={() => setDialog(null)} title="Ajustar vencimento" sheet>
        <form onSubmit={(e) => { e.preventDefault(); void run(() => api(`/api/admin/restaurants/${id}/due-date`, { body: { dueDate, reason }, token })); }} className="space-y-4">
          <p className="text-sm text-muted">Use para corrigir uma data errada ou conceder dias extras. O ajuste fica no histórico e pode ser estornado.</p>
          {subscription && <p className="text-sm">Vencimento atual: <strong>{fmt(subscription.dueDate)}</strong>.</p>}
          <Field label="Novo vencimento"><DateInput min={today()} value={dueDate} onChange={setDueDate} required /></Field>
          <Field label="Motivo"><input value={reason} onChange={(e) => setReason(e.target.value)} minLength={BILLING_LIMITS.reasonMin} maxLength={BILLING_LIMITS.reasonMax} placeholder="Por exemplo: data do pagamento digitada errada" required /></Field>
          {errorLine}
          <div className="flex justify-end"><Button type="submit" loading={saving}><CalendarCog size={16} /> Ajustar</Button></div>
        </form>
      </Modal>

      <Modal open={dialog === 'plan'} onClose={() => setDialog(null)} title="Trocar plano" sheet>
        <form onSubmit={(e) => { e.preventDefault(); void run(() => api(`/api/admin/restaurants/${id}/plan`, { method: 'PATCH', body: { planId }, token })); }} className="space-y-4">
          <Field label="Plano">
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} required>
              <option value="" disabled>Escolha</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatBRL(p.priceCents)} {cycleLabel(p.cycleMonths)}</option>)}
            </select>
          </Field>
          <p className="text-xs text-muted">Vale a partir do próximo pagamento. O vencimento atual não muda.</p>
          {errorLine}
          <div className="flex justify-end"><Button type="submit" loading={saving} disabled={!planId || planId === plan?.id}>Trocar</Button></div>
        </form>
      </Modal>
    </>
  );

  return { entries, history, modals, open };
}
