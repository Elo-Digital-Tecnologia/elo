'use client';

import {
  BarChart3,
  BellRing,
  ChefHat,
  CreditCard,
  KeyRound,
  Star,
  LayoutDashboard,
  Receipt,
  Settings,
  Table2,
  UtensilsCrossed,
  Users,
  ConciergeBell,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, type RealtimeStatus, useAuth, useRealtimeStatus } from '@elo/client';
import { ROLE_LABEL, type Role, type RestaurantSettingsView, type SubscriptionView } from '@elo/core';
import { AppShell, Aurora, Button, ErrorState, GlassCard, type NavItem, SkeletonCards } from '@elo/ui';

interface Me extends RestaurantSettingsView {
  id: string;
  slug: string;
  name: string;
  managerName: string;
  managerContact: string;
  serviceFeeBps: number;
  subscription: SubscriptionView;
}

interface StaffCtx {
  token: string;
  roles: string[];
  /** Signed-in team member's id, to tell "you" apart in lists. */
  sub: string;
  /** Elo support inside the panel: not bound by the admin-vs-admin rule. */
  impersonated: boolean;
  me: Me;
  /** Atualiza os dados do restaurante após editar as configurações. */
  setMe: (me: Me) => void;
}

const Ctx = createContext<StaffCtx | null>(null);
export const useStaff = () => useContext(Ctx)!;

/** First match wins: a waiter who also cooks lands on the salon. */
const HOME_ORDER: [string, string][] = [
  ['restaurant_admin', '/dashboard'],
  ['waiter', '/waiter'],
  ['kitchen', '/kitchen'],
  ['cashier', '/cashier'],
];

/** Landing page for the signed-in member's roles. */
export const homeOf = (slug: string, roles: string[]) =>
  `/r/${slug}${HOME_ORDER.find(([r]) => roles.includes(r))?.[1] ?? '/login'}`;

/** Navigation for every role the member holds, without repeated screens. */
function navFor(base: string, roles: string[]): NavItem[] {
  const item = (path: string, label: string, icon: NavItem['icon'], allowed: string[]): NavItem | null =>
    roles.some((r) => allowed.includes(r)) ? { href: base + path, label, icon } : null;
  const admin = ['restaurant_admin'];
  return [
    item('/dashboard', 'Visão geral', LayoutDashboard, admin),
    item('/dashboard/reports', 'Relatórios', BarChart3, admin),
    item('/dashboard/team-performance', 'Desempenho', Trophy, admin),
    item('/dashboard/reviews', 'Avaliações', Star, admin),
    item('/dashboard/menu', 'Cardápio', UtensilsCrossed, admin),
    item('/dashboard/tables', 'Mesas e QR Codes', Table2, admin),
    item('/waiter', 'Salão', ConciergeBell, ['restaurant_admin', 'waiter']),
    item('/cashier', 'Caixa', Receipt, ['restaurant_admin', 'waiter', 'cashier']),
    item('/kitchen', 'Cozinha', ChefHat, ['restaurant_admin', 'kitchen']),
    item('/dashboard/staff', 'Equipe', Users, admin),
    item('/dashboard/settings', 'Configurações', Settings, admin),
    item('/dashboard/subscription', 'Assinatura', CreditCard, admin),
    item('/account', 'Minha conta', KeyRound, ['restaurant_admin', 'waiter', 'kitchen', 'cashier']),
  ].filter((i): i is NavItem => !!i);
}

const rolesLabel = (roles: string[]) => roles.map((r) => ROLE_LABEL[r as Role] ?? r).join(' · ');

/** Exige login e perfil permitido; mostra aviso de vencimento e bloqueio por suspensão. */
export function Shell({ roles, children }: { roles: string[]; children: ReactNode; bare?: boolean }) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const base = `/r/${slug}`;
  const { token, user, ready, setToken } = useAuth(slug);
  const [me, setMe] = useState<Me | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [failed, setFailed] = useState(false);
  const live = useRealtimeStatus(token, !!me);

  useEffect(() => {
    if (!ready) return;
    if (!token || !user) return void router.replace(`${base}/login`);
    if (!user.roles.some((r) => roles.includes(r))) return void router.replace(homeOf(slug, user.roles));
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = (attempt: number) =>
      api<Me>('/api/restaurant/me', { token })
        .then((data) => {
          // O token precisa ser do restaurante deste endereço.
          if (data.slug !== slug) return setToken(null);
          setMe(data);
        })
        .catch((e) => {
          if (e instanceof ApiError && e.status === 403) setSuspended(true);
          else if (e instanceof ApiError && e.status === 401) setToken(null);
          // Limite de requisições ou queda passageira: tenta de novo sem deslogar.
          else if (attempt < 4) retry = setTimeout(() => void load(attempt + 1), 1500 * (attempt + 1));
          else setFailed(true);
        });
    void load(0);
    return () => clearTimeout(retry);
    // Depende de role/sub, não do objeto `user`.
  }, [ready, token, user?.roles.join(','), user?.sub, roles.join(','), router, setToken, slug, base]);

  // The socket was refused: the API answers why (expired login or suspension) and the shell reacts as on load.
  useEffect(() => {
    if (live !== 'rejected' || !token) return;
    api<Me>('/api/restaurant/me', { token }).catch((e) => {
      if (e instanceof ApiError && e.status === 403) setSuspended(true);
      else if (e instanceof ApiError && e.status === 401) setToken(null);
    });
  }, [live, token, setToken]);

  if (suspended)
    return (
      <main className="relative grid min-h-dvh place-items-center p-4">
        <Aurora />
        <GlassCard strong className="w-full max-w-md space-y-4 p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-pill bg-warning/20 text-warning">
            <ShieldAlert size={30} />
          </span>
          <h1 className="text-2xl font-bold">Acesso suspenso</h1>
          <p className="text-muted">
            O pagamento da assinatura não foi confirmado. Fale com a Elo Digital para reativar o acesso. O cardápio dos clientes continua disponível.
          </p>
          <Button variant="ghost" onClick={() => setToken(null)}>
            Sair
          </Button>
        </GlassCard>
      </main>
    );

  if (failed)
    return (
      <main className="relative grid min-h-dvh place-items-center p-4">
        <Aurora />
        <ErrorState title="Não foi possível conectar" action={<Button onClick={() => location.reload()}>Tentar de novo</Button>}>
          Verifique sua internet e tente novamente.
        </ErrorState>
      </main>
    );

  if (!token || !user || !me)
    return (
      <main className="relative min-h-dvh p-6">
        <Aurora />
        <div className="mx-auto max-w-5xl pt-16">
          <SkeletonCards count={3} />
        </div>
      </main>
    );

  const warn = me.subscription.warning;
  return (
    <Ctx.Provider value={{ token, roles: user.roles, sub: user.sub, impersonated: !!user.impersonatedBy, me, setMe }}>
      <AppShell
        brandSub={me.name}
        nav={navFor(base, user.roles)}
        user={{ name: user.name ?? me.name, role: rolesLabel(user.roles) }}
        onLogout={() => {
          setToken(null);
          // Quem entrou pelo painel Elo volta para ele.
          if (user.impersonatedBy) router.replace(`/admin/restaurants/${me.id}`);
        }}
        defaultCollapsed={user.roles.length === 1 && user.roles[0] === 'kitchen'}
        headerExtra={<LiveIndicator status={live} />}
        footerLinks={[{ label: 'Cardápio dos clientes', href: `/${me.slug}` }]}
        banner={
          user.impersonatedBy ? (
            <GlassCard className="mb-5 flex items-center gap-3 border-brand/40 px-5 py-3 text-sm">
              <ShieldAlert size={20} className="shrink-0 text-brand" />
              <span>
                Você está no painel de {me.name} como equipe Elo Digital. Use <strong>Sair</strong> para voltar ao painel Elo. O acesso termina em 45 minutos.
              </span>
            </GlassCard>
          ) : warn ? (
            <GlassCard className="mb-5 flex items-center gap-3 border-warning/40 px-5 py-3 text-sm">
              <BellRing size={20} className="shrink-0 text-warning" />
              <span>
                Pagamento vencido em {new Date(me.subscription.dueDate).toLocaleDateString('pt-BR')}. Regularize até{' '}
                <strong>{new Date(me.subscription.graceEndsAt).toLocaleDateString('pt-BR')}</strong> para não suspender o acesso.
              </span>
            </GlassCard>
          ) : undefined
        }
      >
        {children}
      </AppShell>
    </Ctx.Provider>
  );
}

const LIVE: Record<RealtimeStatus, { label: string; dot: string }> = {
  connected: { label: 'Ao vivo', dot: 'pulse-dot' },
  connecting: { label: 'Conectando…', dot: 'h-2.5 w-2.5 rounded-pill bg-warning' },
  reconnecting: { label: 'Reconectando…', dot: 'h-2.5 w-2.5 animate-pulse rounded-pill bg-warning' },
  offline: { label: 'Sem internet', dot: 'h-2.5 w-2.5 rounded-pill bg-danger' },
  rejected: { label: 'Desconectado', dot: 'h-2.5 w-2.5 rounded-pill bg-danger' },
};

function LiveIndicator({ status }: { status: RealtimeStatus }) {
  const { label, dot } = LIVE[status];
  const ok = status === 'connected';
  return (
    <span role="status" className={`flex items-center gap-2 pl-2 text-sm ${ok ? 'text-muted' : 'font-medium text-warning'}`}>
      <span className={`shrink-0 ${dot}`} aria-hidden />
      <span className={ok ? 'sr-only sm:not-sr-only' : 'truncate'}>{label}</span>
    </span>
  );
}
