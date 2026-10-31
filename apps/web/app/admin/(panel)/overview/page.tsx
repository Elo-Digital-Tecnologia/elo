'use client';

import { Building2, CircleCheck, FileClock, FileWarning, OctagonAlert, TimerReset } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@elo/client';
import type { RestaurantListItem, RestaurantListView } from '@elo/core';
import { Badge, Donut, ErrorState, GlassCard, PageHeader, SkeletonCards, Stagger, StaggerItem, Stat } from '@elo/ui';
import { useAdmin } from '../../_components/shell';
import Link from 'next/link';

interface Overview {
  total: number;
  active: number;
  grace: number;
  suspended: number;
  /** Without a contract in force yet; also counted as suspended. */
  pending: number;
  contractsEnding: number;
}

const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR');
const fmtDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** Why a restaurant is on the attention list, most pressing first. */
function attentionOf(r: RestaurantListItem): { text: string; badge: string; tone: 'warning' | 'danger' } {
  const { contract, state } = r.subscription;
  if (contract.state === 'pending') return { text: 'sem contrato registrado', badge: 'Pendente', tone: 'danger' };
  if (contract.state === 'ended') return { text: `contrato encerrado em ${contract.endsOn ? fmtDay(contract.endsOn) : '—'}`, badge: 'Suspenso', tone: 'danger' };
  if (state !== 'active') return { text: `venceu em ${fmt(r.dueDate)}`, badge: state === 'grace' ? 'Em tolerância' : 'Suspenso', tone: state === 'grace' ? 'warning' : 'danger' };
  const days = contract.daysLeft ?? 0;
  return { text: days === 0 ? 'contrato termina hoje' : `contrato termina em ${days} ${days === 1 ? 'dia' : 'dias'}`, badge: 'Renovar', tone: 'warning' };
}

function View() {
  const { token, can } = useAdmin();
  const [o, setO] = useState<Overview | null>(null);
  const [attention, setAttention] = useState<RestaurantListItem[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<Overview>('/api/admin/overview', { token }).then(setO).catch(() => setFailed(true));
    if (can('restaurants.view')) {
      api<RestaurantListView>('/api/admin/restaurants?status=attention&sort=due&pageSize=6', { token })
        .then((v) => setAttention(v.items))
        .catch(() => undefined);
    }
  }, [token, can]);

  if (failed) return <ErrorState>Não conseguimos buscar o resumo da plataforma.</ErrorState>;
  if (!o) return <SkeletonCards count={4} />;


  return (
    <>
      <PageHeader title="Visão geral" />
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StaggerItem className="[&>*]:h-full"><Stat label="Restaurantes" value={o.total} icon={Building2} hint="Cadastrados" /></StaggerItem>
        <StaggerItem className="[&>*]:h-full"><Stat label="Assinaturas ativas" value={o.active} icon={CircleCheck} hint="Em dia" /></StaggerItem>
        <StaggerItem className="[&>*]:h-full"><Stat label="Em tolerância" value={o.grace} icon={TimerReset} hint="Vencidos há até 7 dias" /></StaggerItem>
        <StaggerItem className="[&>*]:h-full"><Stat label="Suspensos" value={o.suspended} icon={OctagonAlert} hint="Equipe sem acesso" /></StaggerItem>
        <StaggerItem className="[&>*]:h-full"><Stat label="Pendentes" value={o.pending} icon={FileWarning} hint="Sem contrato em vigor" /></StaggerItem>
        <StaggerItem className="[&>*]:h-full"><Stat label="Contratos a vencer" value={o.contractsEnding} icon={FileClock} hint="Terminam em até 30 dias" /></StaggerItem>
      </Stagger>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <GlassCard className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Situação das assinaturas</h2>
          {o.total ? (
            <Donut data={[{ label: 'Ativas', value: o.active, color: 'hsl(var(--elo-success))' }, { label: 'Em tolerância', value: o.grace, color: 'hsl(var(--elo-warning))' }, { label: 'Suspensas', value: o.suspended, color: 'hsl(var(--elo-danger))' }]} center={{ value: String(o.total), label: 'restaurantes' }} />
          ) : (
            <p className="text-sm text-muted">Nenhum restaurante cadastrado.</p>
          )}
        </GlassCard>
        <GlassCard className="p-6 lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold">Precisam de atenção</h2>
          {attention.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line/60 px-4 py-8 text-center text-sm text-muted">Nenhum restaurante precisa de atenção.</p>
          ) : (
            <Stagger className="space-y-2.5">
              {attention.map((r) => {
                const a = attentionOf(r);
                return (
                  <StaggerItem key={r.id}>
                    <Link href={`/admin/restaurants/${r.id}`} className="flex items-center justify-between gap-3 rounded-md bg-leaf-100/40 px-4 py-3 text-sm transition hover:bg-brand/10">
                      <span><b>{r.name}</b> <span className="text-muted">{a.text}</span></span>
                      <Badge tone={a.tone} dot>{a.badge}</Badge>
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
