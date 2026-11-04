'use client';

import type {
    RestaurantListItem,
    RestaurantListView
} from '@elo/core/api/views/restaurant.view';
import { api } from '@elo/client/http/api-client';
import { Donut } from '@elo/ui/components/data/charts';
import { Stat } from '@elo/ui/components/data/stat';
import { Badge } from '@elo/ui/components/feedback/badge';
import { ErrorState, SkeletonCards } from '@elo/ui/components/feedback/states';
import { GlassCard } from '@elo/ui/components/layout/glass-card';
import { PageHeader } from '@elo/ui/components/layout/section';
import { Stagger, StaggerItem } from '@elo/ui/components/motion/motion';
import { Building2, CircleCheck, FileClock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RESTAURANT_STATUS_LABEL } from '#/_lib/messages/subscription';
import { STATUS_TONE, dayBR } from '../../../_lib/restaurant-status';
import { useAdmin } from '../../_components/shell';

interface Overview {
    total: number;
    active: number;
    grace: number;
    suspended: number;
    pending: number;
    ended: number;
    contractsEnding: number;
}

const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR');

/** Why a restaurant is on the attention list, from its one status. */
function attentionOf(r: RestaurantListItem): {
    text: string;
    badge: string;
    tone: 'success' | 'warning' | 'danger' | 'neutral';
} {
    const { contract, status, reasons } = r.subscription;
    const badge = { badge: RESTAURANT_STATUS_LABEL[status], tone: STATUS_TONE[status] };
    if (status === 'pending')
        return {
            ...badge,
            text: contract.nextStartsOn
                ? `contrato começa em ${dayBR(contract.nextStartsOn)}`
                : 'sem contrato registrado'
        };
    if (status === 'ended')
        return {
            ...badge,
            text: `contrato encerrado em ${contract.endsOn ? dayBR(contract.endsOn) : '—'}`
        };
    if (status === 'suspended' && !reasons.includes('overdue'))
        return { ...badge, text: 'suspenso pela Elo Digital' };
    if (status !== 'active') return { ...badge, text: `venceu em ${fmt(r.dueDate)}` };
    const days = contract.daysLeft ?? 0;
    return {
        text:
            days === 0
                ? 'contrato termina hoje'
                : `contrato termina em ${days} ${days === 1 ? 'dia' : 'dias'}`,
        badge: 'Renovar',
        tone: 'warning'
    };
}

function View() {
    const { token, can } = useAdmin();
    const [o, setO] = useState<Overview | null>(null);
    const [attention, setAttention] = useState<RestaurantListItem[]>([]);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        api<Overview>('/api/admin/overview', { token })
            .then(setO)
            .catch(() => setFailed(true));
        if (can('restaurants.view')) {
            api<RestaurantListView>(
                '/api/admin/restaurants?status=attention&sort=due&pageSize=6',
                { token }
            )
                .then((v) => setAttention(v.items))
                .catch(() => undefined);
        }
    }, [token, can]);

    if (failed)
        return <ErrorState>Não conseguimos buscar o resumo da plataforma.</ErrorState>;
    if (!o) return <SkeletonCards count={4} />;

    return (
        <>
            <PageHeader title="Visão geral" />
            <Stagger className="grid gap-4 sm:grid-cols-3">
                <StaggerItem className="[&>*]:h-full">
                    <Stat
                        label="Restaurantes"
                        value={o.total}
                        icon={Building2}
                        hint={`${o.pending} pendentes · ${o.ended} encerrados`}
                    />
                </StaggerItem>
                <StaggerItem className="[&>*]:h-full">
                    <Stat
                        label="Assinaturas ativas"
                        value={o.active}
                        icon={CircleCheck}
                        hint={`${o.grace} em tolerância · ${o.suspended} suspensos`}
                    />
                </StaggerItem>
                <StaggerItem className="[&>*]:h-full">
                    <Stat
                        label="Contratos a vencer"
                        value={o.contractsEnding}
                        icon={FileClock}
                        hint="Terminam em até 30 dias"
                    />
                </StaggerItem>
            </Stagger>

            <div className="mt-5 grid gap-5 lg:grid-cols-5">
                <GlassCard className="p-6 lg:col-span-2">
                    <h2 className="mb-4 text-lg font-semibold">
                        Situação dos restaurantes
                    </h2>
                    {o.total ? (
                        <Donut
                            data={[
                                {
                                    label: 'Ativos',
                                    value: o.active,
                                    color: 'hsl(var(--elo-success))'
                                },
                                {
                                    label: 'Em tolerância',
                                    value: o.grace,
                                    color: 'hsl(var(--elo-warning))'
                                },
                                {
                                    label: 'Suspensos',
                                    value: o.suspended,
                                    color: 'hsl(var(--elo-danger))'
                                },
                                {
                                    label: 'Pendentes',
                                    value: o.pending,
                                    color: 'hsl(var(--elo-chart-4))'
                                },
                                {
                                    label: 'Contratos encerrados',
                                    value: o.ended,
                                    color: 'hsl(var(--elo-chart-2))'
                                }
                            ]}
                            center={{ value: String(o.total), label: 'restaurantes' }}
                        />
                    ) : (
                        <p className="text-sm text-muted">
                            Nenhum restaurante cadastrado.
                        </p>
                    )}
                </GlassCard>
                <GlassCard className="p-6 lg:col-span-3">
                    <h2 className="mb-4 text-lg font-semibold">Precisam de atenção</h2>
                    {attention.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-line/60 px-4 py-8 text-center text-sm text-muted">
                            Nenhum restaurante precisa de atenção.
                        </p>
                    ) : (
                        <Stagger className="space-y-2.5">
                            {attention.map((r) => {
                                const a = attentionOf(r);
                                return (
                                    <StaggerItem key={r.id}>
                                        <Link
                                            href={`/admin/restaurants/${r.id}`}
                                            className="flex items-center justify-between gap-3 rounded-md bg-leaf-100/40 px-4 py-3 text-sm transition hover:bg-brand/10"
                                        >
                                            <span>
                                                <b>{r.name}</b>{' '}
                                                <span className="text-muted">
                                                    {a.text}
                                                </span>
                                            </span>
                                            <Badge tone={a.tone} dot>
                                                {a.badge}
                                            </Badge>
                                        </Link>
                                    </StaggerItem>
                                );
                            })}
                        </Stagger>
                    )}
                </GlassCard>
            </div>
        </>
    );
}

export default function OverviewPage() {
    return <View />;
}
