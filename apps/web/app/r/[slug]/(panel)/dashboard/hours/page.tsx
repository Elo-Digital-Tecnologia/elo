'use client';

import { CalendarClock, CalendarX2, CirclePause, Clock, Play } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, useRealtime } from '@elo/client';
import { availability, FIELD_RULES, type FieldError, PAUSE_LIMITS, type PauseList, type PauseProblem, type PauseView } from '@elo/core';
import { Badge, Button, ConfirmModal, DateTimeInput, EmptyState, ErrorState, Field, GlassCard, Modal, PageHeader, Pagination, SkeletonCards, Textarea } from '@elo/ui';
import { rule, unexpected, useForm } from '../../../../../_lib/use-form';
import { RequireRoles, useStaff } from '../../../_components/shell';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const PROBLEM: Record<PauseProblem, string> = {
  ends_before_start: 'O fim precisa ser depois do início.',
  starts_in_past: 'O início não pode estar no passado.',
  too_far_ahead: `Agende com no máximo ${PAUSE_LIMITS.aheadDays} dias de antecedência.`,
  overlaps: 'Já existe uma parada nesse período. Encerre ou ajuste a outra antes.',
};

const QUICK: [string, number][] = [
  ['1 hora', 60],
  ['3 horas', 180],
  ['1 dia', 1440],
  ['1 semana', 10080],
];

const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
/** `datetime-local` value in the device's time, a minute from now. */
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

interface Draft {
  startNow: boolean;
  start: string;
  untilReopen: boolean;
  end: string;
  reason: string;
}

/** Codes only this form raises, each with its own sentence in `MESSAGES`. */
const own = (code: 'start_missing' | 'end_missing') => ({ code }) as unknown as FieldError;

const MESSAGES = {
  start_missing: 'Informe quando a parada começa.',
  end_missing: 'Informe quando a parada termina, ou marque "Até reabrir".',
};

const dateError = (v: string, missing: FieldError): FieldError | null => (!v ? missing : Number.isNaN(new Date(v).getTime()) ? { code: 'invalid_date' } : null);

const DRAFT_CHECKS = {
  start: (v: string, all: Draft) => (all.startNow ? null : dateError(v, own('start_missing'))),
  end: (v: string, all: Draft) => (all.untilReopen ? null : dateError(v, own('end_missing'))),
  reason: rule(FIELD_RULES.pauseReason),
};

const freshDraft = (startNow: boolean): Draft => ({
  startNow,
  start: localInput(new Date(Date.now() + 3_600_000)),
  untilReopen: true,
  end: '',
  reason: '',
});

function period(p: PauseView) {
  const end = p.endedAt && (!p.endsAt || p.endedAt < p.endsAt) ? p.endedAt : p.endsAt;
  return end ? `${when(p.startsAt)} até ${when(end)}` : `Desde ${when(p.startsAt)}, até reabrir`;
}

/** "2 dias e 3 h", "5 h 30 min", "45 min". */
function lasted(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days) return `${days} ${days === 1 ? 'dia' : 'dias'}${hours ? ` e ${hours} h` : ''}`;
  if (hours) return `${hours} h${rest ? ` ${String(rest).padStart(2, '0')} min` : ''}`;
  return `${rest} min`;
}

const dayOf = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
const hourOf = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** One closure that already happened: when, for how long, why and who set it. */
function PastPause({ pause }: { pause: PauseView }) {
  const early = !!pause.endedAt && (!pause.endsAt || pause.endedAt < pause.endsAt);
  const end = early ? pause.endedAt! : pause.endsAt!;
  const sameDay = dayOf(pause.startsAt) === dayOf(end);
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-brand/10 text-brand">
          <CirclePause size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">
            {sameDay ? (
              <>{dayOf(pause.startsAt)}, {hourOf(pause.startsAt)} às {hourOf(end)}</>
            ) : (
              <>{dayOf(pause.startsAt)}, {hourOf(pause.startsAt)} <span className="text-muted">até</span> {dayOf(end)}, {hourOf(end)}</>
            )}
          </p>
          <p className="truncate text-sm text-muted">{pause.reason ?? 'Sem motivo informado'}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-12 text-sm sm:shrink-0 sm:justify-end sm:pl-0">
        <Badge>{lasted(new Date(end).getTime() - new Date(pause.startsAt).getTime())}</Badge>
        {early && <Badge tone="success">Reaberto antes</Badge>}
        <span className="text-muted">por {pause.createdByName}</span>
      </div>
    </div>
  );
}

function View() {
  const { token, roles, me } = useStaff();
  const [data, setData] = useState<PauseList | null>(null);
  const [failed, setFailed] = useState(false);
  const [composing, setComposing] = useState(false);
  const form = useForm<Draft>(freshDraft(true), DRAFT_CHECKS, MESSAGES);
  const draft = composing ? form.values : null;
  const [ending, setEnding] = useState<PauseView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pastPage, setPastPage] = useState(1);
  const load = useCallback(async () => {
    try {
      setData(await api<PauseList>(`/api/restaurant/pauses?page=${pastPage}`, { token }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [token, pastPage]);
  useEffect(() => {
    void load();
  }, [load]);
  useRealtime({ 'restaurant.availability': () => void load() }, token);

  const startAt = draft ? (draft.startNow ? new Date() : new Date(draft.start)) : null;
  const endAt = draft && !draft.untilReopen && draft.end ? new Date(draft.end) : null;
  const preview =
    draft && startAt && !Number.isNaN(startAt.getTime())
      ? availability({
          hours: null,
          pauses: [{ startsAt: startAt, endsAt: endAt, reason: draft.reason }],
          now: new Date(Math.max(startAt.getTime(), Date.now())),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      : null;

  const quick = (minutes: number) => {
    if (!draft || !startAt) return;
    form.set('untilReopen', false);
    form.set('end', localInput(new Date(startAt.getTime() + minutes * 60_000)));
  };

  const compose = (startNow: boolean) => {
    setError(null);
    form.reset(freshDraft(startNow));
    setComposing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!draft || !form.validate()) return;
    setBusy(true);
    try {
      await api('/api/restaurant/pauses', {
        body: {
          startsAt: draft.startNow ? undefined : new Date(draft.start).toISOString(),
          endsAt: endAt ? endAt.toISOString() : null,
          reason: draft.reason.trim() || null,
        },
        token,
      });
      setComposing(false);
      await load();
    } catch (err) {
      if (form.fromServer(err, { startsAt: 'start', endsAt: 'end' })) return;
      const problems = err instanceof ApiError && Array.isArray(err.data.problems) ? (err.data.problems as PauseProblem[]) : [];
      setError(problems.length ? problems.map((p) => PROBLEM[p]).join(' ') : unexpected(err));
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (!ending) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/restaurant/pauses/${ending.id}/end`, { method: 'POST', body: {}, token });
      setEnding(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setEnding(null);
        await load();
      } else setError('Não foi possível encerrar a parada. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  if (failed) return <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar o funcionamento.</ErrorState>;
  if (!data) return <SkeletonCards count={2} />;
  const a = data.availability;
  const running = data.upcoming.find((p) => new Date(p.startsAt).getTime() <= Date.now());
  const owner = roles.includes('restaurant_admin');

  return (
    <>
      <PageHeader
        title="Funcionamento"
        description="Fora do horário ou numa parada, nenhuma mesa nova abre. As mesas já abertas continuam pedindo até o garçom fechar."
        actions={
          <div className="flex flex-wrap gap-2">
            {!running && <Button variant="danger" onClick={() => compose(true)}><CirclePause size={17} /> Pausar agora</Button>}
            <Button variant="ghost" onClick={() => compose(false)}><CalendarClock size={17} /> Agendar parada</Button>
          </div>
        }
      />

      <div className="space-y-6">
        <GlassCard strong className="flex flex-col gap-3 p-6">
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-pill ${a.open ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
              {a.open ? <Clock size={24} /> : <CirclePause size={24} />}
            </span>
            <div className="min-w-0">
              <Badge tone={a.open ? 'success' : 'danger'} dot>{a.open ? 'Aberto' : 'Fechado'}</Badge>
              <p className="mt-1 font-semibold">{a.label ?? 'Sem horário cadastrado: o restaurante fica sempre aberto.'}</p>
              {a.pauseReason && <p className="text-sm text-muted">Motivo mostrado aos clientes: {a.pauseReason}</p>}
            </div>
          </div>
          {running && (
            <div>
              <Button onClick={() => { setError(null); setEnding(running); }}><Play size={16} /> Reabrir agora</Button>
            </div>
          )}
          <div className="border-t border-line/40 pt-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Horário da semana</h2>
              {owner && <Link href={`/r/${me.slug}/dashboard/settings`} className="text-sm font-semibold text-brand underline-offset-2 hover:underline">Editar em Configurações</Link>}
            </div>
            {me.openingHours ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {DAYS.map((d, i) => {
                  const h = me.openingHours?.[i];
                  return (
                    <li key={d} className={`surface px-3 py-2 text-sm ${i === new Date().getDay() ? 'ring-1 ring-brand/50' : ''}`}>
                      <span className="block text-xs text-muted">{d}</span>
                      <span className={`block font-semibold tabular-nums ${h ? '' : 'text-muted'}`}>{h ? `${h.open}–${h.close}` : 'Fechado'}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhum horário cadastrado: o restaurante fica sempre aberto.</p>
            )}
          </div>
        </GlassCard>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Paradas atuais e agendadas</h2>
          {data.upcoming.length === 0 ? (
            <EmptyState icon={CalendarX2} title="Nenhuma parada agendada">Use &quot;Pausar agora&quot; para um imprevisto, ou agende férias e reformas com antecedência.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {data.upcoming.map((p) => {
                const now = new Date(p.startsAt).getTime() <= Date.now();
                return (
                  <li key={p.id}>
                    <GlassCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={now ? 'danger' : 'warning'} dot>{now ? 'Em andamento' : 'Agendada'}</Badge>
                          <span className="font-semibold">{period(p)}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted">{p.reason ? `Motivo: ${p.reason}` : 'Sem motivo informado'} · por {p.createdByName}</p>
                      </div>
                      <Button variant="ghost" onClick={() => { setError(null); setEnding(p); }}>{now ? 'Reabrir agora' : 'Cancelar parada'}</Button>
                    </GlassCard>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {data.past.total > 0 && (
          <section>
            <h2 className="mb-1 text-xl font-semibold">Últimas paradas</h2>
            <p className="mb-3 text-sm text-muted">As que chegaram a acontecer, da mais recente para a mais antiga. Agendamentos cancelados ficam só nos registros.</p>
            <GlassCard className="divide-y divide-line/40">
              {data.past.items.map((p) => <PastPause key={p.id} pause={p} />)}
            </GlassCard>
            <Pagination className="mt-3" page={data.past.page} pageSize={data.past.pageSize} total={data.past.total} onPage={setPastPage} />
          </section>
        )}
      </div>

      <Modal open={!!draft} onClose={() => setComposing(false)} title={draft?.startNow ? 'Pausar agora' : 'Agendar parada'} sheet>
        {draft && (
          <form onSubmit={save} noValidate className="space-y-4">
            {!draft.startNow && (
              <Field label="Começa em" error={form.errors.start}>
                <DateTimeInput name="start" invalid={!!form.errors.start} onBlur={() => form.touch('start')} value={draft.start} min={localInput(new Date())} onChange={(v) => form.set('start', v)} aria-label="Começa em" />
              </Field>
            )}
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Termina</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={draft.untilReopen} onChange={() => form.set('untilReopen', true)} /> Até reabrir manualmente
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={!draft.untilReopen} onChange={() => form.set('untilReopen', false)} /> Em uma data e hora
              </label>
              {!draft.untilReopen && (
                <DateTimeInput name="end" invalid={!!form.errors.end} onBlur={() => form.touch('end')} aria-label="Termina em" value={draft.end} min={draft.startNow ? localInput(new Date()) : draft.start} onChange={(v) => form.set('end', v)} />
              )}
              {form.errors.end && <p aria-live="polite" className="text-xs text-danger">{form.errors.end}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK.map(([label, minutes]) => (
                  <button key={label} type="button" onClick={() => quick(minutes)} className="rounded-pill border border-line/60 px-3 py-1.5 text-xs font-semibold transition hover:border-brand/60 hover:text-brand">
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="Motivo (opcional)" hint={`Aparece para os clientes no cardápio. ${draft.reason.length}/${FIELD_RULES.pauseReason.max}`} error={form.errors.reason}>
              <Textarea {...form.bind('reason')} maxLength={FIELD_RULES.pauseReason.max} rows={2} placeholder="Ex.: Reforma da cozinha" />
            </Field>
            {preview && (
              <p className="surface px-4 py-3 text-sm">
                <span className="block text-xs text-muted">O cliente vai ver</span>
                <strong>{preview.label}</strong>
                {preview.pauseReason && <span className="text-muted"> · {preview.pauseReason}</span>}
              </p>
            )}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setComposing(false)}>Voltar</Button>
              <Button type="submit" variant={draft.startNow ? 'danger' : 'primary'} loading={busy}>{draft.startNow ? 'Pausar agora' : 'Agendar'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!ending}
        title={ending && new Date(ending.startsAt).getTime() <= Date.now() ? 'Reabrir agora?' : 'Cancelar esta parada?'}
        confirmLabel={ending && new Date(ending.startsAt).getTime() <= Date.now() ? 'Reabrir' : 'Cancelar parada'}
        loading={busy}
        error={error}
        onConfirm={end}
        onClose={() => setEnding(null)}
      >
        <p>{ending ? period(ending) : ''}</p>
        <p className="text-muted">Os clientes voltam a abrir mesas{ending && new Date(ending.startsAt).getTime() <= Date.now() ? ' na hora' : ' nesse período'}, se estiver dentro do horário.</p>
      </ConfirmModal>
    </>
  );
}

export default function HoursPage() {
  return (
    <RequireRoles roles={['restaurant_admin', 'manager']}>
      <View />
    </RequireRoles>
  );
}
