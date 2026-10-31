'use client';

import { CalendarClock, CircleCheck, Layers, ShieldAlert, TimerReset } from 'lucide-react';
import { cycleLabel, formatBRL } from '@elo/core';
import { Badge, GlassCard, PageHeader } from '@elo/ui';
import { RequireRoles, useStaff } from '../../../_components/shell';

const STATE = {
  active: { label: 'Ativa', tone: 'success', icon: CircleCheck, text: 'Tudo certo. Seu acesso está liberado.' },
  grace: { label: 'Vencida, em tolerância', tone: 'warning', icon: TimerReset, text: 'O sistema segue funcionando. Regularize o pagamento antes do fim do prazo.' },
  suspended: { label: 'Suspensa', tone: 'danger', icon: ShieldAlert, text: 'O acesso da equipe está bloqueado até a confirmação do pagamento.' },
} as const;

const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

function View() {
  const { me } = useStaff();
  const s = me.subscription;
  const st = STATE[s.state];
  const Icon = st.icon;
  const daysLeft = Math.ceil((new Date(s.dueDate).getTime() - Date.now()) / 86_400_000);

  return (
    <>
      <PageHeader title="Assinatura" />
      <div className="grid gap-5 lg:grid-cols-5">
        <GlassCard strong className="flex flex-col gap-4 p-7 lg:col-span-3">
          <div className="flex items-center gap-4">
            <span className={`grid h-14 w-14 place-items-center rounded-pill ${s.state === 'active' ? 'bg-success/15 text-success' : s.state === 'grace' ? 'bg-warning/20 text-warning' : 'bg-danger/15 text-danger'}`}><Icon size={28} /></span>
            <div>
              <Badge tone={st.tone} dot>{st.label}</Badge>
              <p className="mt-2 text-muted">{st.text}</p>
            </div>
          </div>
          <div className="font-display text-5xl font-extrabold tracking-tight">
            {daysLeft >= 0 ? `${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}` : `${-daysLeft} ${-daysLeft === 1 ? 'dia' : 'dias'} de atraso`}
          </div>
          <p className="text-sm text-muted">{daysLeft >= 0 ? 'até o próximo vencimento' : 'desde o vencimento'}</p>
        </GlassCard>
        <GlassCard className="space-y-4 p-7 lg:col-span-2">
          {s.plan && (
            <div className="flex items-center gap-3"><Layers className="text-brand" size={22} /><div><div className="text-sm text-muted">Plano</div><div className="font-semibold">{s.plan.name} · {formatBRL(s.plan.priceCents)} {cycleLabel(s.plan.cycleMonths)}</div></div></div>
          )}
          <div className="flex items-center gap-3"><CalendarClock className="text-brand" size={22} /><div><div className="text-sm text-muted">Vencimento</div><div className="font-semibold">{fmt(s.dueDate)}</div></div></div>
          <div className="flex items-center gap-3"><TimerReset className="text-brand" size={22} /><div><div className="text-sm text-muted">Acesso mantido até</div><div className="font-semibold">{fmt(s.graceEndsAt)}</div></div></div>
          <p className="border-t border-line/40 pt-4 text-sm text-muted">O pagamento é confirmado manualmente pela equipe Elo Digital. O prazo de tolerância após o vencimento é de 7 dias.</p>
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
