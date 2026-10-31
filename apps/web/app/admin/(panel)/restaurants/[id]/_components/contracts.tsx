'use client';

import { FilePlus2, FileSignature, RefreshCw, Repeat2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import {
  addYears,
  CONTRACT_KIND_LABEL,
  CONTRACT_LIMITS,
  CONTRACT_ORIGIN_LABEL,
  type ContractKind,
  type ContractOrigin,
  type ContractProblem,
  contractStatus,
  type ContractView,
  dayError,
  type DocumentView,
  FIELD_RULES,
  toDay,
} from '@elo/core';
import { Badge, Button, DateInput, Field, GlassCard, Input, Modal, Select } from '@elo/ui';
import { rule, unexpected, useForm } from '../../../../../_lib/use-form';
import { DocumentPicker, DocumentPreview } from './documents';

const fmt = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
const nextDay = (day: string) => toDay(new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000));
/** A year of contract: from `start` to the day before the same date next year. */
const yearFrom = (start: string) => toDay(new Date(Date.parse(`${addYears(start, 1)}T12:00:00Z`) - 86_400_000));

export const CONTRACT_PROBLEM: Record<ContractProblem, string> = {
  signed_in_future: 'A data de assinatura não pode ser no futuro.',
  ends_before_start: 'O fim da vigência precisa ser depois do início.',
  too_long: `A vigência pode ter no máximo ${CONTRACT_LIMITS.maxYears} anos.`,
  already_has_contract: 'Este restaurante já tem contrato: use Renovar ou Converter.',
  nothing_to_renew: 'Não há contrato para renovar.',
  overlaps: 'A renovação precisa começar depois do fim do contrato atual.',
  nothing_to_convert: 'A conversão vale para o piloto atual e começa durante a vigência dele (ou no dia seguinte ao fim).',
  conversion_is_definitive: 'A conversão gera um contrato definitivo.',
};

const CODES: Record<string, string> = {
  invalid_document: 'O arquivo enviado não pertence a este restaurante. Envie de novo.',
  document_in_use: 'Este arquivo já está em outro contrato. Envie o contrato certo.',
};

export interface ContractFormState {
  kind: ContractKind;
  signedOn: string;
  startsOn: string;
  endsOn: string;
  name: string;
  role: string;
  contact: string;
  document: DocumentView | null;
}

/** Checks shared by the contract modal and the contract section of the new-restaurant form. */
export const contractChecks = {
  signedOn: (v: string) => dayError(v, { max: toDay(new Date()) }),
  startsOn: (v: string) => dayError(v),
  endsOn: (v: string, all: ContractFormState) => dayError(v, { min: all.startsOn || undefined }),
  name: rule(FIELD_RULES.personName),
  role: rule(FIELD_RULES.signatoryRole),
  contact: rule(FIELD_RULES.contact),
};

/** Kind, dates and signatory of a contract; the file picker is placed by the caller. */
export function ContractFields({ form, fixedKind }: { form: ReturnType<typeof useForm<ContractFormState>>; fixedKind?: boolean }) {
  const v = form.values;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo">
          <Select value={v.kind} disabled={fixedKind} onChange={(e) => form.set('kind', e.target.value as ContractKind)}>
            <option value="pilot">Piloto</option>
            <option value="definitive">Definitivo</option>
          </Select>
        </Field>
        <Field label="Assinado em" error={form.errors.signedOn}>
          <DateInput name="signedOn" value={v.signedOn} max={toDay(new Date())} onChange={(d) => form.set('signedOn', d)} onBlur={() => form.touch('signedOn')} invalid={!!form.errors.signedOn} required />
        </Field>
        <Field label="Início da vigência" error={form.errors.startsOn}>
          <DateInput name="startsOn" value={v.startsOn} onChange={(d) => form.set('startsOn', d)} onBlur={() => form.touch('startsOn')} invalid={!!form.errors.startsOn} required />
        </Field>
        <Field label="Fim da vigência" error={form.errors.endsOn}>
          <DateInput name="endsOn" value={v.endsOn} min={v.startsOn || undefined} onChange={(d) => form.set('endsOn', d)} onBlur={() => form.touch('endsOn')} invalid={!!form.errors.endsOn} required />
        </Field>
      </div>
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium">Signatário</legend>
        <Field label="Nome" error={form.errors.name}><Input {...form.bind('name')} maxLength={FIELD_RULES.personName.max} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cargo" error={form.errors.role}><Input {...form.bind('role')} maxLength={FIELD_RULES.signatoryRole.max} placeholder="Por exemplo: sócio-proprietário" /></Field>
          <Field label="Contato" hint="Telefone com DDD ou e-mail." error={form.errors.contact}><Input {...form.bind('contact')} maxLength={FIELD_RULES.contact.max} /></Field>
        </div>
      </fieldset>
    </>
  );
}

type Operation = { origin: ContractOrigin; title: string };

/**
 * Contract card of a restaurant in the Elo panel: what is in force, until when,
 * the history and the actions that add a new contract (first one, conversion of a
 * pilot, renewal), each with its own signed file.
 */
export function useContracts({ id, token, canManage, signatory, onChange }: { id: string; token: string; canManage: boolean; signatory: { name: string; contact: string }; onChange: () => Promise<void> }) {
  const [list, setList] = useState<ContractView[] | null>(null);
  const [op, setOp] = useState<Operation | null>(null);
  const [viewing, setViewing] = useState<ContractView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<ContractFormState>(
    { kind: 'pilot', signedOn: '', startsOn: '', endsOn: '', name: '', role: '', contact: '', document: null },
    { ...contractChecks, document: (d: DocumentView | null) => (d ? null : { code: 'required' }) },
  );

  const load = useCallback(async () => setList(await api<ContractView[]>(`/api/admin/restaurants/${id}/contracts`, { token })), [id, token]);
  useEffect(() => {
    void load().catch(() => setList([]));
  }, [load]);

  const today = toDay(new Date());
  const status = list ? contractStatus(list, today) : null;
  const latest = list?.[0] ?? null;

  const open = (origin: ContractOrigin) => {
    setError(null);
    const start = origin === 'renewal' && status?.endsOn ? nextDay(status.endsOn) : today;
    const last = latest?.signatory;
    form.reset({
      kind: origin === 'conversion' ? 'definitive' : latest?.kind ?? 'pilot',
      signedOn: today,
      startsOn: start,
      endsOn: yearFrom(start),
      name: last?.name ?? signatory.name,
      role: last?.role ?? '',
      contact: last?.contact ?? signatory.contact,
      document: null,
    });
    setOp({ origin, title: origin === 'initial' ? 'Registrar contrato' : origin === 'conversion' ? 'Converter em definitivo' : 'Renovar contrato' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!op || !form.validate()) return;
    const v = form.values;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/admin/restaurants/${id}/contracts`, {
        body: { kind: v.kind, origin: op.origin, signedOn: v.signedOn, startsOn: v.startsOn, endsOn: v.endsOn, signatory: { name: v.name, role: v.role, contact: v.contact }, documentId: v.document!.id },
        token,
      });
      setOp(null);
      await Promise.all([load(), onChange()]);
    } catch (err) {
      if (form.fromServer(err, { 'signatory.name': 'name', 'signatory.role': 'role', 'signatory.contact': 'contact', documentId: 'document' })) return;
      const problems = err instanceof ApiError && Array.isArray(err.data.problems) ? (err.data.problems as ContractProblem[]) : [];
      setError(problems.length ? problems.map((p) => CONTRACT_PROBLEM[p]).join(' ') : (err instanceof ApiError && CODES[err.code]) || unexpected(err));
    } finally {
      setSaving(false);
    }
  };

  const tone = status?.state === 'active' ? (status.daysLeft !== null && status.daysLeft <= CONTRACT_LIMITS.warnDays ? 'warning' : 'success') : 'danger';
  const label = status?.state === 'active' ? `Vigente · ${CONTRACT_KIND_LABEL[status.current!.kind]}` : status?.state === 'ended' ? 'Encerrado' : 'Pendente';

  const card = (
    <GlassCard className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><FileSignature size={20} className="text-brand" /> Contrato</h2>
        {status && <Badge tone={tone} dot>{label}</Badge>}
      </div>
      {!list ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : !status?.current ? (
        <p className="text-sm text-muted">Nenhum contrato registrado. Sem contrato, a equipe não acessa o painel e o cardápio fica fora do ar.</p>
      ) : (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Vigência</dt><dd className="font-medium">{fmt(status.current.startsOn)} a {fmt(status.current.effectiveEndsOn)}</dd></div>
          <div>
            <dt className="text-muted">{status.state === 'ended' ? 'Encerrou em' : 'Coberto até'}</dt>
            <dd className="font-medium">{status.endsOn ? fmt(status.endsOn) : '—'}{status.daysLeft !== null && <span className="text-muted"> · {status.daysLeft} {status.daysLeft === 1 ? 'dia' : 'dias'}</span>}</dd>
          </div>
          <div><dt className="text-muted">Assinado em</dt><dd className="font-medium">{fmt(status.current.signedOn)}</dd></div>
          <div className="min-w-0"><dt className="text-muted">Signatário</dt><dd className="font-medium [overflow-wrap:anywhere]">{status.current.signatory.name} · {status.current.signatory.role}</dd><dd className="text-muted [overflow-wrap:anywhere]">{status.current.signatory.contact}</dd></div>
        </dl>
      )}
      <div className="flex flex-wrap gap-2 border-t border-line/40 pt-4">
        {status?.current && <Button variant="ghost" onClick={() => setViewing(status.current)}><FileSignature size={16} /> Ver contrato</Button>}
        {canManage && list && (
          <>
            {!latest && <Button onClick={() => open('initial')}><FilePlus2 size={16} /> Registrar contrato</Button>}
            {latest?.kind === 'pilot' && <Button onClick={() => open('conversion')}><Repeat2 size={16} /> Converter em definitivo</Button>}
            {latest && <Button variant={latest.kind === 'pilot' ? 'ghost' : 'primary'} onClick={() => open('renewal')}><RefreshCw size={16} /> Renovar</Button>}
          </>
        )}
      </div>
    </GlassCard>
  );

  const history =
    list && list.length > 0 ? (
      <ol className="space-y-2">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setViewing(c)} className="surface flex w-full flex-col gap-1 px-4 py-3 text-left text-sm transition hover:bg-brand/5 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Badge tone="brand">{CONTRACT_KIND_LABEL[c.kind]}</Badge>
                <span className="font-medium">{CONTRACT_ORIGIN_LABEL[c.origin]}</span>
                <span className="text-muted">{fmt(c.startsOn)} a {fmt(c.effectiveEndsOn)}{c.effectiveEndsOn !== c.endsOn && ' (convertido)'}</span>
              </span>
              <span className="shrink-0 text-muted">por {c.createdByName} · {new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
            </button>
          </li>
        ))}
      </ol>
    ) : null;

  const modals = (
    <>
      <Modal open={!!op} onClose={() => setOp(null)} title={op?.title ?? ''} sheet>
        <form onSubmit={submit} noValidate className="space-y-4">
          {op?.origin === 'conversion' && <p className="text-sm text-muted">O piloto vale até a véspera do início do definitivo. O histórico guarda os dois.</p>}
          {op?.origin === 'renewal' && <p className="text-sm text-muted">A renovação começa depois do fim do contrato atual. O contrato atual continua no histórico.</p>}
          <ContractFields form={form} fixedKind={op?.origin === 'conversion'} />
          <Field label="Contrato assinado" error={form.errors.document}>
            <DocumentPicker restaurantId={id} kind="contract" token={token} value={form.values.document} onChange={(d) => { form.set('document', d); form.touch('document'); }} invalid={!!form.errors.document} />
          </Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOp(null)}>Voltar</Button>
            <Button type="submit" loading={saving}>Salvar contrato</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${CONTRACT_KIND_LABEL[viewing.kind]} · ${CONTRACT_ORIGIN_LABEL[viewing.origin]}` : ''} sheet>
        {viewing && (
          <div className="space-y-4 text-sm">
            <p>Vigência de {fmt(viewing.startsOn)} a {fmt(viewing.effectiveEndsOn)}{viewing.effectiveEndsOn !== viewing.endsOn && ` (previsto até ${fmt(viewing.endsOn)}, convertido antes)`}. Assinado em {fmt(viewing.signedOn)} por {viewing.signatory.name} ({viewing.signatory.role}, {viewing.signatory.contact}).</p>
            <DocumentPreview doc={viewing.document} token={token} />
          </div>
        )}
      </Modal>
    </>
  );

  return { card, history, modals };
}
