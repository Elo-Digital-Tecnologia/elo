'use client';

import { Building2, CircleCheck, OctagonAlert, TimerReset } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@elo/client';
import { accessState } from '@elo/core';
import { Badge, Donut, ErrorState, GlassCard, PageHeader, SkeletonCards, Stagger, StaggerItem, Stat } from '@elo/ui';
import { Shell, useAdmin } from '../_components/shell';
import Link from 'next/link';

interface Overview {
  total: number;
  active: number;
  grace: number;
  suspended: number;
}
interface Restaurant {
  id: string;
  name: string;
  slug: string;
  dueDate: string;
  suspended: boolean;
}

const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR');

function View() {
  const { token, can } = useAdmin();
  const [o, setO] = useState<Overview | null>(null);
  const [list, setList] = useState<Restaurant[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<Overview>('/api/admin/overview', { token }).then(setO).catch(() => setFailed(true));
    if (can('restaurants')) api<Restaurant[]>('/api/admin/restaurants', { token }).then(setList).catch(() => undefined);
  }, [token, can]);

  if (failed) return <ErrorState>Não conseguimos buscar o resumo da plataforma.</ErrorState>;
  if (!o) return <SkeletonCards count={4} />;

  const attention = list
    .map((r) => ({ r, state: accessState(new Date(r.dueDate), new Date(), r.suspended) }))
    .filter((x) => x.state !== 'active')
    .slice(0, 6);

  return (
    <>
      <PageHeader title="Visão geral" description="Situação das assinaturas de todos os restaurantes." />
      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StaggerItem><Stat label="Restaurantes" value={o.total} icon={Building2} /></StaggerItem>
        <StaggerItem><Stat label="Assinaturas ativas" value={o.active} icon={CircleCheck} hint="Em dia" /></StaggerItem>
        <StaggerItem><Stat label="Em tolerância" value={o.grace} icon={TimerReset} hint="Até 7 dias após o vencimento" /></StaggerItem>
        <StaggerItem><Stat label="Suspensos" value={o.suspended} icon={OctagonAlert} hint="Funcionários sem acesso" /></StaggerItem>
      </Stagger>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <GlassCard className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Situação das assinaturas</h2>
          {o.total ? (
            <Donut data={[{ label: 'Ativas', value: o.active }, { label: 'Em tolerância', value: o.grace }, { label: 'Suspensas', value: o.suspended }]} center={{ value: String(o.total), label: 'restaurantes' }} />
          ) : (
            <p className="text-sm text-muted">Cadastre o primeiro restaurante para ver a distribuição.</p>
          )}
        </GlassCard>
        <GlassCard className="p-6 lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold">Precisam de atenção</h2>
          {attention.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line/60 px-4 py-8 text-center text-sm text-muted">Nenhum pagamento pendente. Todos os restaurantes estão em dia.</p>
          ) : (
            <Stagger className="space-y-2.5">
              {attention.map(({ r, state }) => (
                <StaggerItem key={r.id}>
                  <Link href={`/restaurants/${r.id}`} className="flex items-center justify-between gap-3 rounded-md bg-leaf-100/40 px-4 py-3 text-sm transition hover:bg-brand/10">
                    <span><b>{r.name}</b> <span className="text-muted">venceu em {fmt(r.dueDate)}</span></span>
                    <Badge tone={state === 'grace' ? 'warning' : 'danger'} dot>{state === 'grace' ? 'Em tolerância' : 'Suspenso'}</Badge>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </GlassCard>
      </div>
    </>
  );
}

export default function OverviewPage() {
  return (
    <Shell>
      <View />
    </Shell>
  );
}
