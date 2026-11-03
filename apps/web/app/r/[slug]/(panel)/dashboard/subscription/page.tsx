'use client';

import type { RestaurantStatus, SubscriptionView } from '@elo/core';
import type { LucideIcon } from 'lucide-react';
import { CONTRACT_KIND_LABEL, GRACE_DAYS, cycleLabel, formatBRL } from '@elo/core';
import { Badge, GlassCard, PageHeader } from '@elo/ui';
import {
    Ban,
    CalendarClock,
    CircleCheck,
    FileClock,
    FileSignature,
    FileX,
    Hourglass,
    Layers,
    ShieldAlert,
    TimerReset
} from 'lucide-react';
import { dayBR, plural, trialLine } from '../../../../../_lib/restaurant-status';
import { RequireRoles, useStaff } from '../../../_components/shell';

const STATE: Record<
    RestaurantStatus,
    {
        label: string;
        tone: 'success' | 'warning' | 'danger' | 'neutral';
        icon: LucideIcon;
        text: string;
    }
> = {
    active: {
        label: 'Ativa',
        tone: 'success',
        icon: CircleCheck,
        text: 'Tudo certo. Seu acesso está liberado.'
    },
    grace: {
        label: 'Vencida, em tolerância',
        tone: 'warning',
        icon: TimerReset,
        text: 'O sistema segue funcionando. Regularize o pagamento antes do fim do prazo.'
    },
    suspended: {
        label: 'Suspensa',
        tone: 'danger',
        icon: ShieldAlert,
        text: 'O acesso da equipe está bloqueado até a confirmação do pagamento.'
    },
    pending: {
        label: 'Contrato pendente',
        tone: 'neutral',
        icon: FileClock,
        text: 'O contrato com a Elo Digital ainda não está valendo.'
    },
    ended: {
        label: 'Contrato encerrado',
        tone: 'danger',
        icon: FileX,
        text: 'O contrato com a Elo Digital terminou e não há renovação valendo.'
    }
};

const ICON_TONE = {
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/15 text-danger',
    neutral: 'bg-info/15 text-info'
} as const;

const fmt = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

/** The big line of the main card: days to the due date, or what the contract is waiting for. */
function headline(s: SubscriptionView): { value: string; caption: string } {
    if (s.status === 'pending')
        return s.contract.nextStartsOn
            ? {
                  value: dayBR(s.contract.nextStartsOn),
                  caption:
                      'início do contrato; até lá o painel e o cardápio ficam fora do ar'
              }
            : {
                  value: 'Sem contrato',
                  caption:
                      'fale com a Elo Digital para registrar o contrato e liberar o acesso'
              };
    if (s.status === 'ended')
        return {
            value: s.contract.endsOn ? dayBR(s.contract.endsOn) : 'Encerrado',
            caption: s.contract.nextStartsOn
                ? `fim do contrato; a renovação começa em ${dayBR(s.contract.nextStartsOn)}`
                : 'fim do contrato; fale com a Elo Digital para renovar'
        };
    const daysLeft = Math.ceil((new Date(s.dueDate).getTime() - Date.now()) / 86_400_000);
    return daysLeft >= 0
        ? { value: plural(daysLeft, 'dia', 'dias'), caption: 'até o próximo vencimento' }
        : {
              value: `${plural(-daysLeft, 'dia', 'dias')} de atraso`,
              caption: 'desde o vencimento'
          };
}

function View() {
    const { me } = useStaff();
    const s = me.subscription;
    const st = STATE[s.status];
    const Icon = st.icon;
    const trial = trialLine(s.trial);
    const billing = s.status !== 'pending';
    const head = headline(s);
    const voided = s.contract.voided;

    return (
        <>
            <PageHeader title="Assinatura" />
            <div className="grid gap-5 lg:grid-cols-5">
                <GlassCard strong className="flex flex-col gap-4 p-7 lg:col-span-3">
                    <div className="flex items-center gap-4">
                        <span
                            className={`grid shrink-0 h-14 w-14 place-items-center rounded-pill ${ICON_TONE[st.tone]}`}
                        >
                            <Icon size={28} />
                        </span>
                        <div>
                            <Badge tone={st.tone} dot>
                                {st.label}
                            </Badge>
                            <p className="mt-2 text-muted">{st.text}</p>
                        </div>
                    </div>
                    <div className="font-display text-5xl font-extrabold tracking-tight">
                        {head.value}
                    </div>
                    <p className="text-sm text-muted">{head.caption}</p>
                    {voided && (
                        <p className="flex items-start gap-2 border-t border-line/40 pt-4 text-sm">
                            <Ban size={16} className="mt-0.5 shrink-0 text-danger" />O
                            contrato
                            {voided.kind
                                ? ` ${CONTRACT_KIND_LABEL[voided.kind].toLowerCase()}`
                                : ''}{' '}
                            registrado por último foi anulado pela Elo Digital em{' '}
                            {new Date(voided.at).toLocaleDateString('pt-BR')}
                            {s.contract.state === 'active'
                                ? ', e o contrato anterior voltou a valer.'
                                : '. Ele não vale mais.'}
                        </p>
                    )}
                    {trial && (
                        <p className="flex items-start gap-2 border-t border-line/40 pt-4 text-sm">
                            <Hourglass size={16} className="mt-0.5 shrink-0 text-info" />{' '}
                            {trial}
                        </p>
                    )}
                </GlassCard>
                <GlassCard className="space-y-4 p-7 lg:col-span-2">
                    {s.plan && (
                        <div className="flex items-center gap-3">
                            <Layers className="text-brand" size={22} />
                            <div>
                                <div className="text-sm text-muted">Plano</div>
                                <div className="font-semibold">
                                    {s.plan.name} · {formatBRL(s.plan.priceCents)}{' '}
                                    {cycleLabel(s.plan.cycleMonths)}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <CalendarClock className="text-brand" size={22} />
                        <div>
                            <div className="text-sm text-muted">Vencimento</div>
                            <div className="font-semibold">
                                {billing ? fmt(s.dueDate) : 'Começa com o contrato'}
                            </div>
                        </div>
                    </div>
                    {(s.status === 'active' || s.status === 'grace') && (
                        <div className="flex items-center gap-3">
                            <TimerReset className="text-brand" size={22} />
                            <div>
                                <div className="text-sm text-muted">
                                    Acesso mantido até
                                </div>
                                <div className="font-semibold">{fmt(s.graceEndsAt)}</div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <FileSignature className="text-brand" size={22} />
                        <div>
                            <div className="text-sm text-muted">
                                {s.contract.state === 'ended'
                                    ? 'Contrato encerrado em'
                                    : 'Contrato vigente até'}
                            </div>
                            <div className="font-semibold">
                                {s.contract.endsOn
                                    ? dayBR(s.contract.endsOn)
                                    : s.contract.nextStartsOn
                                      ? `Começa em ${dayBR(s.contract.nextStartsOn)}`
                                      : 'Aguardando o contrato'}
                            </div>
                        </div>
                    </div>
                    <p className="border-t border-line/40 pt-4 text-sm text-muted">
                        O pagamento é confirmado manualmente pela equipe Elo Digital. O
                        prazo de tolerância após o vencimento é de {GRACE_DAYS} dias.
                    </p>
                </GlassCard>
            </div>
        </>
    );
}

export default function SubscriptionPage() {
    return (
        <RequireRoles roles={['restaurant_admin']}>
            <View />
        </RequireRoles>
    );
}
