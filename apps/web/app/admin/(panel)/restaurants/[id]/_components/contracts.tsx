'use client';

import type {
    ContractKind,
    ContractOrigin,
    ContractProblem,
    ContractView,
    DocumentView,
    PlanView,
    TrialStatus
} from '@elo/core';
import { ApiError, api } from '@elo/client';
import {
    CONTRACT_KIND_LABEL,
    CONTRACT_LIMITS,
    CONTRACT_ORIGIN_LABEL,
    FIELD_RULES,
    GRACE_DAYS,
    addYears,
    businessDay,
    contractStatus,
    cycleLabel,
    dayError,
    fieldError,
    formatBRL,
    latestContract,
    shiftDay
} from '@elo/core';
import {
    Badge,
    Button,
    ConfirmModal,
    DateInput,
    Field,
    GlassCard,
    Input,
    Modal,
    Select,
    Textarea
} from '@elo/ui';
import {
    Ban,
    FilePlus2,
    FileSignature,
    Hourglass,
    RefreshCw,
    Repeat2
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { dayBR, plural, trialLine } from '../../../../../_lib/restaurant-status';
import { rule, unexpected, useForm } from '../../../../../_lib/use-form';
import { DocumentPicker, DocumentPreview } from './documents';

/** A year of contract: from `start` to the day before the same date next year. */
const yearFrom = (start: string) => shiftDay(addYears(start, 1), -1);
const TRIAL_SHORTCUTS = [0, 7, 14, 30];

export const CONTRACT_PROBLEM: Record<ContractProblem, string> = {
    signed_in_future: 'A data de assinatura não pode ser no futuro.',
    signed_after_end: 'A assinatura não pode ser depois do fim da vigência.',
    ends_before_start: 'O fim da vigência precisa ser depois do início.',
    too_long: `A vigência pode ter no máximo ${CONTRACT_LIMITS.maxYears} anos.`,
    already_has_contract: 'Este restaurante já tem contrato: use Renovar ou Converter.',
    nothing_to_renew: 'Não há contrato para renovar.',
    overlaps: 'A renovação precisa começar depois do fim do contrato atual.',
    nothing_to_convert:
        'A conversão vale para o piloto atual e começa durante a vigência dele (ou no dia seguinte ao fim).',
    conversion_is_definitive: 'A conversão gera um contrato definitivo.',
    trial_only_initial_pilot:
        'Período de teste só no primeiro contrato, e só se for piloto.',
    plan_required: 'Escolha o plano do contrato.'
};

const CODES: Record<string, string> = {
    invalid_document: 'O arquivo enviado não pertence a este restaurante. Envie de novo.',
    document_in_use: 'Este arquivo já está em outro contrato. Envie o contrato certo.',
    not_latest_contract: 'Só o contrato mais recente pode ser anulado.',
    contract_already_voided: 'Este contrato já foi anulado.',
    trial_over: 'O período de teste já terminou.',
    plan_inactive: 'Este plano foi desativado. Escolha outro.',
    plan_not_found: 'Este plano não existe mais. Escolha outro.'
};

/** Message for a failed contract request: the rules broken, a known code, or the generic one. */
export function contractError(err: unknown): string {
    const problems =
        err instanceof ApiError && Array.isArray(err.data.problems)
            ? (err.data.problems as ContractProblem[])
            : [];
    return problems.length
        ? problems.map((p) => CONTRACT_PROBLEM[p]).join(' ')
        : (err instanceof ApiError && CODES[err.code]) || unexpected(err);
}

export interface ContractFormState {
    kind: ContractKind;
    signedOn: string;
    startsOn: string;
    endsOn: string;
    /** Typed as text; only a first pilot sends it. */
    trialDays: string;
    /** Plan signed in the contract: its price is kept with it. */
    planId: string;
    name: string;
    role: string;
    contact: string;
    document: DocumentView | null;
}

/** A form prefilled for a contract starting on `start`, signed by `signatory`. */
export function contractDraft(
    start: string,
    signatory: { name: string; role?: string; contact: string },
    kind: ContractKind = 'pilot',
    planId = ''
): ContractFormState {
    return {
        kind,
        signedOn: businessDay(),
        startsOn: start,
        endsOn: start ? yearFrom(start) : '',
        trialDays: kind === 'pilot' ? '14' : '0',
        planId,
        name: signatory.name,
        role: signatory.role ?? '',
        contact: signatory.contact,
        document: null
    };
}

/** Checks shared by the contract modal and the contract section of the new-restaurant form. */
export const contractChecks = {
    signedOn: (v: string) => dayError(v, { max: businessDay() }),
    startsOn: (v: string) => dayError(v),
    endsOn: (v: string, all: ContractFormState) =>
        dayError(v, { min: all.startsOn || undefined }),
    trialDays: (v: string, all: ContractFormState) =>
        all.kind === 'pilot'
            ? fieldError(FIELD_RULES.trialDays, v.trim() === '' ? undefined : Number(v))
            : null,
    planId: (v: string) => (v ? null : { code: 'required' as const }),
    name: rule(FIELD_RULES.personName),
    role: rule(FIELD_RULES.signatoryRole),
    contact: rule(FIELD_RULES.contact)
};

/** Request body for a contract; the trial goes only with a first pilot. */
export function contractBody(
    v: ContractFormState,
    origin: ContractOrigin,
    documentId: string
) {
    return {
        kind: v.kind,
        origin,
        signedOn: v.signedOn,
        startsOn: v.startsOn,
        endsOn: v.endsOn,
        signatory: { name: v.name, role: v.role, contact: v.contact },
        documentId,
        planId: v.planId,
        ...(origin === 'initial' && v.kind === 'pilot'
            ? { trialDays: Number(v.trialDays) }
            : {})
    };
}

/** Plans a contract can sign: the active ones, plus `keep` (the one in force) even if it was retired. */
export async function contractPlans(
    token: string,
    keep?: string | null
): Promise<PlanView[]> {
    const list = await api<PlanView[]>('/api/admin/plans', { token });
    return list.filter((p) => p.active || p.id === keep);
}

/**
 * Plan, kind, dates, trial and signatory of a contract; the file picker is placed by the caller.
 * `withTrial` is for a first contract: a pilot then gets its free days.
 */
export function ContractFields({
    form,
    plans,
    fixedKind,
    withTrial
}: {
    form: ReturnType<typeof useForm<ContractFormState>>;
    plans: PlanView[];
    fixedKind?: boolean;
    withTrial?: boolean;
}) {
    const v = form.values;
    const today = businessDay();
    return (
        <>
            <Field
                label="Plano"
                hint="O preço fica guardado com o contrato: mudanças futuras no plano não o alteram."
                error={form.errors.planId}
            >
                <Select
                    name="planId"
                    value={v.planId}
                    onChange={(e) => form.set('planId', e.target.value)}
                    onBlur={() => form.touch('planId')}
                    invalid={!!form.errors.planId}
                >
                    <option value="" disabled>
                        Escolha o plano
                    </option>
                    {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name} · {formatBRL(p.priceCents)}{' '}
                            {cycleLabel(p.cycleMonths)}
                        </option>
                    ))}
                </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo">
                    <Select
                        value={v.kind}
                        disabled={fixedKind}
                        onChange={(e) => form.set('kind', e.target.value as ContractKind)}
                    >
                        <option value="pilot">Piloto</option>
                        <option value="definitive">Definitivo</option>
                    </Select>
                </Field>
                <Field label="Assinado em" error={form.errors.signedOn}>
                    <DateInput
                        name="signedOn"
                        value={v.signedOn}
                        max={today}
                        onChange={(d) => form.set('signedOn', d)}
                        onBlur={() => form.touch('signedOn')}
                        invalid={!!form.errors.signedOn}
                        required
                    />
                </Field>
                <Field label="Início da vigência" error={form.errors.startsOn}>
                    <DateInput
                        name="startsOn"
                        value={v.startsOn}
                        onChange={(d) => form.set('startsOn', d)}
                        onBlur={() => form.touch('startsOn')}
                        invalid={!!form.errors.startsOn}
                        required
                    />
                </Field>
                <Field label="Fim da vigência" error={form.errors.endsOn}>
                    <DateInput
                        name="endsOn"
                        value={v.endsOn}
                        min={v.startsOn || undefined}
                        onChange={(d) => form.set('endsOn', d)}
                        onBlur={() => form.touch('endsOn')}
                        invalid={!!form.errors.endsOn}
                        required
                    />
                </Field>
            </div>
            {withTrial && v.kind === 'pilot' && (
                <Field
                    label="Período de teste (dias)"
                    hint="Conta a partir do início da vigência; a cobrança começa no dia seguinte ao fim do teste. 0 = sem teste."
                    error={form.errors.trialDays}
                >
                    <Input
                        {...form.bind('trialDays')}
                        inputMode="numeric"
                        maxLength={2}
                        onChange={(e) =>
                            form.set('trialDays', e.target.value.replace(/\D/g, ''))
                        }
                    />
                    <span
                        className="mt-2 flex flex-wrap gap-1.5"
                        role="group"
                        aria-label="Atalhos do período de teste"
                    >
                        {TRIAL_SHORTCUTS.map((d) => {
                            const on = v.trialDays === String(d);
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => form.set('trialDays', String(d))}
                                    className={`rounded-pill border px-3 py-1 text-xs font-medium transition ${on ? 'border-brand bg-brand text-brand-fg' : 'border-line/60 text-muted hover:text-fg'}`}
                                >
                                    {d === 0 ? 'Sem teste' : `${d} dias`}
                                </button>
                            );
                        })}
                    </span>
                </Field>
            )}
            <fieldset className="space-y-3">
                <legend className="mb-1 text-sm font-medium">Signatário</legend>
                <Field label="Nome" error={form.errors.name}>
                    <Input
                        {...form.bind('name')}
                        maxLength={FIELD_RULES.personName.max}
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Cargo" error={form.errors.role}>
                        <Input
                            {...form.bind('role')}
                            maxLength={FIELD_RULES.signatoryRole.max}
                            placeholder="Por exemplo: sócio-proprietário"
                        />
                    </Field>
                    <Field
                        label="Contato"
                        hint="Telefone com DDD ou e-mail."
                        error={form.errors.contact}
                    >
                        <Input
                            {...form.bind('contact')}
                            maxLength={FIELD_RULES.contact.max}
                        />
                    </Field>
                </div>
            </fieldset>
        </>
    );
}

type Operation = { origin: ContractOrigin; title: string };
const TITLE: Record<ContractOrigin, string> = {
    initial: 'Registrar contrato',
    conversion: 'Converter em definitivo',
    renewal: 'Renovar contrato'
};

/**
 * Contract card of a restaurant in the Elo panel: what is in force, until when, the
 * pilot's trial, the history and the actions that add a contract (first one,
 * conversion of a pilot, renewal), void the latest or end the trial early.
 */
export function useContracts({
    id,
    token,
    canManage,
    canEndTrial,
    signatory,
    trial,
    planId,
    onChange
}: {
    id: string;
    token: string;
    canManage: boolean;
    canEndTrial: boolean;
    signatory: { name: string; contact: string };
    trial: TrialStatus | null;
    /** Plan in force, offered first in a new contract. */
    planId: string | null;
    onChange: () => Promise<void>;
}) {
    const [plans, setPlans] = useState<PlanView[]>([]);
    const [list, setList] = useState<ContractView[] | null>(null);
    const [op, setOp] = useState<Operation | null>(null);
    const [viewing, setViewing] = useState<ContractView | null>(null);
    const [voiding, setVoiding] = useState<ContractView | null>(null);
    const [endingTrial, setEndingTrial] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const form = useForm<ContractFormState>(contractDraft(businessDay(), signatory), {
        ...contractChecks,
        document: (d: DocumentView | null) => (d ? null : { code: 'required' })
    });
    const reasonForm = useForm({ reason: '' }, { reason: rule(FIELD_RULES.reason) });

    const load = useCallback(
        async () =>
            setList(
                await api<ContractView[]>(`/api/admin/restaurants/${id}/contracts`, {
                    token
                })
            ),
        [id, token]
    );
    useEffect(() => {
        void load().catch(() => setList([]));
    }, [load]);

    const today = businessDay();
    const status = list ? contractStatus(list, today) : null;
    const latest = list ? latestContract(list) : null;

    const open = (origin: ContractOrigin) => {
        setError(null);
        const start =
            origin === 'renewal' && latest
                ? shiftDay(latest.effectiveEndsOn, 1) > today
                    ? shiftDay(latest.effectiveEndsOn, 1)
                    : today
                : today;
        const last = latest?.signatory;
        form.reset(
            contractDraft(
                start,
                last ?? signatory,
                origin === 'conversion' ? 'definitive' : (latest?.kind ?? 'pilot'),
                planId ?? ''
            )
        );
        void contractPlans(token, planId)
            .then(setPlans)
            .catch(() => setPlans([]));
        setOp({ origin, title: TITLE[origin] });
    };

    /** Runs a request, reloads the contracts and the page, and keeps any error on screen. */
    const run = async (fn: () => Promise<unknown>, fields?: (e: unknown) => boolean) => {
        setSaving(true);
        setError(null);
        try {
            await fn();
            await Promise.all([load(), onChange()]);
            return true;
        } catch (err) {
            if (!fields?.(err)) setError(contractError(err));
            return false;
        } finally {
            setSaving(false);
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!op || !form.validate()) return;
        const ok = await run(
            () =>
                api(`/api/admin/restaurants/${id}/contracts`, {
                    body: contractBody(form.values, op.origin, form.values.document!.id),
                    token
                }),
            (err) =>
                form.fromServer(err, {
                    'signatory.name': 'name',
                    'signatory.role': 'role',
                    'signatory.contact': 'contact',
                    'documentId': 'document'
                })
        );
        if (ok) setOp(null);
    };

    const confirmReason = (path: string, close: () => void) => async () => {
        if (!reasonForm.validate()) return;
        if (
            await run(
                () => api(path, { body: reasonForm.values, token }),
                reasonForm.fromServer
            )
        )
            close();
    };

    const askReason = (then: () => void) => {
        setError(null);
        reasonForm.reset({ reason: '' });
        then();
    };

    const state = status?.state;
    const tone =
        state === 'active'
            ? status!.daysLeft !== null && status!.daysLeft <= CONTRACT_LIMITS.warnDays
                ? 'warning'
                : 'success'
            : state === 'ended'
              ? 'danger'
              : 'neutral';
    const label =
        state === 'active'
            ? `Vigente · ${CONTRACT_KIND_LABEL[status!.current!.kind]}`
            : state === 'ended'
              ? 'Encerrado'
              : 'Pendente';
    const trialText = trial ? trialLine(trial) : null;
    const voided = status?.voided;
    const voidedNote = voided
        ? `${voided.kind ? `O contrato ${CONTRACT_KIND_LABEL[voided.kind].toLowerCase()}` : 'O contrato'} registrado por último foi anulado em ${new Date(voided.at).toLocaleDateString('pt-BR')}${status?.state === 'active' ? '; vale o contrato anterior.' : status?.current ? '; o contrato anterior já terminou.' : '; não há outro contrato.'}`
        : null;

    /** Buttons that add a contract: the first one, the pilot's conversion or a renewal. */
    const actions =
        canManage && list ? (
            <>
                {!latest && (
                    <Button onClick={() => open('initial')}>
                        <FilePlus2 size={16} /> Registrar contrato
                    </Button>
                )}
                {latest?.kind === 'pilot' && (
                    <Button onClick={() => open('conversion')}>
                        <Repeat2 size={16} /> Converter em definitivo
                    </Button>
                )}
                {latest && (
                    <Button
                        variant={latest.kind === 'pilot' ? 'ghost' : 'primary'}
                        onClick={() => open('renewal')}
                    >
                        <RefreshCw size={16} /> Renovar
                    </Button>
                )}
            </>
        ) : null;

    const card = (
        <GlassCard className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <FileSignature size={20} className="text-brand" /> Contrato
                </h2>
                {status && (
                    <Badge tone={tone} dot>
                        {label}
                    </Badge>
                )}
            </div>
            {!list ? (
                <p className="text-sm text-muted">Carregando…</p>
            ) : !status?.current ? (
                <p className="text-sm text-muted">Nenhum contrato registrado.</p>
            ) : (
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div>
                        <dt className="text-muted">Vigência</dt>
                        <dd className="font-medium">
                            {dayBR(status.current.startsOn)} a{' '}
                            {dayBR(status.current.effectiveEndsOn)}
                        </dd>
                    </div>
                    {status.endsOn &&
                        status.endsOn !== status.current.effectiveEndsOn && (
                            <div>
                                <dt className="text-muted">Coberto até</dt>
                                <dd className="font-medium">{dayBR(status.endsOn)}</dd>
                            </div>
                        )}
                    {status.daysLeft !== null && (
                        <div>
                            <dt className="text-muted">Faltam</dt>
                            <dd className="font-medium">
                                {plural(status.daysLeft, 'dia', 'dias')}
                            </dd>
                        </div>
                    )}
                    {status.nextStartsOn && (
                        <div>
                            <dt className="text-muted">Próximo começa em</dt>
                            <dd className="font-medium">{dayBR(status.nextStartsOn)}</dd>
                        </div>
                    )}
                    <div className="min-w-0">
                        <dt className="text-muted">Signatário</dt>
                        <dd className="font-medium [overflow-wrap:anywhere]">
                            {status.current.signatory.name} ·{' '}
                            {status.current.signatory.role}
                        </dd>
                    </div>
                </dl>
            )}
            {trialText && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line/40 px-3.5 py-2.5 text-sm">
                    <span className="flex min-w-0 items-start gap-2">
                        <Hourglass size={16} className="mt-0.5 shrink-0 text-info" />{' '}
                        {trialText}
                    </span>
                    {canEndTrial && trial?.state === 'running' && (
                        <Button
                            variant="ghost"
                            onClick={() => askReason(() => setEndingTrial(true))}
                        >
                            Encerrar teste
                        </Button>
                    )}
                </div>
            )}
            {voidedNote && (
                <p className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm">
                    <Ban size={16} className="mt-0.5 shrink-0 text-danger" /> {voidedNote}
                </p>
            )}
            <div className="mt-auto flex flex-wrap gap-2 border-t border-line/40 pt-4">
                {status?.current && (
                    <Button variant="ghost" onClick={() => setViewing(status.current)}>
                        <FileSignature size={16} /> Ver contrato
                    </Button>
                )}
                {actions}
            </div>
        </GlassCard>
    );

    const history =
        list && list.length > 0 ? (
            <ol className="space-y-2">
                {list.map((c) => (
                    <li key={c.id}>
                        <button
                            type="button"
                            onClick={() => setViewing(c)}
                            className={`surface flex w-full flex-col gap-1 px-4 py-3 text-left text-sm transition hover:bg-brand/5 sm:flex-row sm:items-center sm:gap-4 ${c.voided ? 'opacity-70' : ''}`}
                        >
                            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                <Badge tone="brand">{CONTRACT_KIND_LABEL[c.kind]}</Badge>
                                {c.voided && <Badge tone="danger">Anulado</Badge>}
                                <span className="font-medium">
                                    {CONTRACT_ORIGIN_LABEL[c.origin]}
                                </span>
                                <span
                                    className={`text-muted ${c.voided ? 'line-through' : ''}`}
                                >
                                    {dayBR(c.startsOn)} a {dayBR(c.effectiveEndsOn)}
                                    {c.effectiveEndsOn !== c.endsOn && ' (convertido)'}
                                </span>
                                {c.plan && (
                                    <span className="text-muted">
                                        · {c.plan.name} {formatBRL(c.plan.priceCents)}{' '}
                                        {cycleLabel(c.plan.cycleMonths)}
                                    </span>
                                )}
                                {c.trialDays > 0 && (
                                    <span className="text-muted">
                                        · teste de {plural(c.trialDays, 'dia', 'dias')}
                                    </span>
                                )}
                            </span>
                            <span className="shrink-0 text-muted">
                                por {c.createdByName} ·{' '}
                                {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                        </button>
                    </li>
                ))}
            </ol>
        ) : null;

    const modals = (
        <>
            <Modal open={!!op} onClose={() => setOp(null)} title={op?.title ?? ''} sheet>
                <form onSubmit={submit} noValidate className="space-y-4">
                    {op?.origin === 'conversion' && (
                        <p className="text-sm text-muted">
                            O piloto vale até a véspera do início do definitivo; se ainda
                            estiver em teste, o teste acaba ali e a cobrança começa. O
                            histórico guarda os dois.
                        </p>
                    )}
                    {op?.origin === 'renewal' && (
                        <p className="text-sm text-muted">
                            A renovação começa depois do fim do contrato atual. O contrato
                            atual continua no histórico.
                        </p>
                    )}
                    <ContractFields
                        form={form}
                        plans={plans}
                        fixedKind={op?.origin === 'conversion'}
                        withTrial={op?.origin === 'initial'}
                    />
                    <Field label="Contrato assinado" error={form.errors.document}>
                        <DocumentPicker
                            restaurantId={id}
                            kind="contract"
                            token={token}
                            value={form.values.document}
                            onChange={(d) => {
                                form.set('document', d);
                                form.touch('document');
                            }}
                            invalid={!!form.errors.document}
                        />
                    </Field>
                    {error && (
                        <p role="alert" className="text-sm text-danger">
                            {error}
                        </p>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setOp(null)}>
                            Voltar
                        </Button>
                        <Button type="submit" loading={saving}>
                            Salvar contrato
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={!!viewing && !voiding}
                onClose={() => setViewing(null)}
                title={
                    viewing
                        ? `${CONTRACT_KIND_LABEL[viewing.kind]} · ${CONTRACT_ORIGIN_LABEL[viewing.origin]}`
                        : ''
                }
                sheet
            >
                {viewing && (
                    <div className="space-y-4 text-sm">
                        {viewing.voided && (
                            <p className="rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5">
                                <strong>Anulado</strong> por {viewing.voided.byName} em{' '}
                                {new Date(viewing.voided.at).toLocaleDateString('pt-BR')}:{' '}
                                {viewing.voided.reason}
                            </p>
                        )}
                        <p>
                            Vigência de {dayBR(viewing.startsOn)} a{' '}
                            {dayBR(viewing.effectiveEndsOn)}
                            {viewing.effectiveEndsOn !== viewing.endsOn &&
                                ` (previsto até ${dayBR(viewing.endsOn)}, convertido antes)`}
                            . Assinado em {dayBR(viewing.signedOn)} por{' '}
                            {viewing.signatory.name} ({viewing.signatory.role},{' '}
                            {viewing.signatory.contact}).
                            {viewing.trialDays > 0 &&
                                ` Período de teste de ${plural(viewing.trialDays, 'dia', 'dias')}.`}
                            {viewing.plan &&
                                ` Plano ${viewing.plan.name}: ${formatBRL(viewing.plan.priceCents)} ${cycleLabel(viewing.plan.cycleMonths)}.`}
                        </p>
                        <DocumentPreview doc={viewing.document} token={token} />
                        {canManage && latest?.id === viewing.id && (
                            <div className="flex justify-end border-t border-line/40 pt-4">
                                <Button
                                    variant="danger"
                                    onClick={() => askReason(() => setVoiding(viewing))}
                                >
                                    <Ban size={16} /> Anular contrato
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <ConfirmModal
                open={!!voiding}
                title="Anular este contrato?"
                confirmLabel="Anular contrato"
                danger
                loading={saving}
                error={error}
                onConfirm={confirmReason(
                    `/api/admin/restaurants/${id}/contracts/${voiding?.id}/void`,
                    () => {
                        setVoiding(null);
                        setViewing(null);
                    }
                )}
                onClose={() => setVoiding(null)}
            >
                <p>
                    Use quando o contrato foi registrado com erro. Ele continua no
                    histórico como anulado e deixa de valer na hora
                    {voiding?.origin === 'conversion'
                        ? ': o piloto volta a valer até o fim previsto, com o teste, se houver.'
                        : voiding?.origin === 'initial'
                          ? ': sem outro contrato, o restaurante volta a ficar Pendente.'
                          : '.'}{' '}
                    Depois, registre o contrato certo.
                </p>
                {voiding && (
                    <Field
                        label="Motivo"
                        hint="Fica nos registros do restaurante."
                        error={reasonForm.errors.reason}
                    >
                        <Textarea
                            {...reasonForm.bind('reason')}
                            maxLength={FIELD_RULES.reason.max}
                            rows={3}
                            placeholder="Por exemplo: datas de vigência digitadas erradas"
                        />
                    </Field>
                )}
            </ConfirmModal>

            <ConfirmModal
                open={endingTrial}
                title="Encerrar o período de teste?"
                confirmLabel="Encerrar teste"
                danger
                loading={saving}
                error={error}
                onConfirm={confirmReason(`/api/admin/restaurants/${id}/trial/end`, () =>
                    setEndingTrial(false)
                )}
                onClose={() => setEndingTrial(false)}
            >
                <p>
                    O teste termina hoje e a cobrança começa: o vencimento passa a ser
                    hoje e, sem pagamento, a equipe ainda tem os {GRACE_DAYS} dias de
                    tolerância antes de perder o acesso. Os pagamentos já registrados
                    passam a contar a partir de hoje: os dias de teste que sobravam deixam
                    de ser dias pagos. Para cortar o acesso agora, use{' '}
                    <strong>Suspender acesso</strong>.
                </p>
                {endingTrial && (
                    <Field
                        label="Motivo"
                        hint="Fica nos registros do restaurante."
                        error={reasonForm.errors.reason}
                    >
                        <Textarea
                            {...reasonForm.bind('reason')}
                            maxLength={FIELD_RULES.reason.max}
                            rows={3}
                            placeholder="Por exemplo: o restaurante decidiu começar a usar já"
                        />
                    </Field>
                )}
            </ConfirmModal>
        </>
    );

    return {
        card,
        history,
        actions,
        modals,
        open,
        latest,
        current: status?.current ?? null,
        loaded: !!list
    };
}
