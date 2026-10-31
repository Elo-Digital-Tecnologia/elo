'use client';

import {
  BarChart3,
  BellRing,
  BookOpen,
  CalendarClock,
  Clock,
  ChefHat,
  ClipboardList,
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
  History,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, type RealtimeStatus, useAuth, useRealtime, useRealtimeStatus } from '@elo/client';
import { useAlertsControl, useStaffAlerts } from './alerts';
import { type Availability, ROLE_LABEL, type Role, type RestaurantSettingsView, type SubscriptionView } from '@elo/core';
import { AppShell, Aurora, Button, ErrorState, GlassCard, type NavItem, PageLoading, SkeletonCards } from '@elo/ui';

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
  /** Signed-in member's name and profile photo, shown in the header. */
  name: string;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
}

const Ctx = createContext<StaffCtx | null>(null);
export const useStaff = () => useContext(Ctx)!;

/** First match wins: a waiter who also cooks lands on the salon. */
const HOME_ORDER: [string, string][] = [
  ['restaurant_admin', '/dashboard'],
  ['manager', '/dashboard'],
  ['waiter', '/waiter'],
  ['kitchen', '/kitchen'],
  ['cashier', '/cashier'],
];

/** Landing page for the signed-in member's roles. */
export const homeOf = (slug: string, roles: string[]) =>
  `/r/${slug}${HOME_ORDER.find(([r]) => roles.includes(r))?.[1] ?? '/login'}`;

/** Navigation for every role the member holds, without repeated screens. */
function navFor(base: string, roles: string[], impersonated: boolean): NavItem[] {
  const item = (path: string, label: string, icon: NavItem['icon'], allowed: string[]): NavItem | null =>
    roles.some((r) => allowed.includes(r)) ? { href: base + path, label, icon } : null;
  // The restaurant's own settings and subscription stay with the administrator; the rest is shared with managers.
  const admin = ['restaurant_admin'];
  const leads = ['restaurant_admin', 'manager'];
  return [
    item('/dashboard', 'Visão geral', LayoutDashboard, leads),
    item('/dashboard/reports', 'Relatórios', BarChart3, leads),
    item('/dashboard/team-performance', 'Desempenho', Trophy, leads),
    item('/dashboard/reviews', 'Avaliações', Star, leads),
    item('/dashboard/menu', 'Cardápio', UtensilsCrossed, leads),
    item('/dashboard/tables', 'Mesas e QR Codes', Table2, leads),
    item('/waiter', 'Salão', ConciergeBell, [...leads, 'waiter']),
    item('/cashier', 'Caixa', Receipt, [...leads, 'waiter', 'cashier']),
    item('/kitchen', 'Cozinha', ChefHat, [...leads, 'kitchen']),
    item('/orders', 'Pedidos', ClipboardList, [...leads, 'waiter', 'cashier', 'kitchen']),
    item('/dashboard/staff', 'Equipe', Users, leads),
    item('/dashboard/hours', 'Funcionamento', CalendarClock, leads),
    item('/dashboard/settings', 'Configurações', Settings, admin),
    item('/dashboard/activity', 'Registros', History, leads),
    item('/dashboard/subscription', 'Assinatura', CreditCard, admin),
    // Elo support has a temporary pass, not an account of this restaurant.
    impersonated ? null : item('/account', 'Minha conta', KeyRound, [...leads, 'waiter', 'kitchen', 'cashier']),
  ].filter((i): i is NavItem => !!i);
}

const rolesLabel = (roles: string[]) => roles.map((r) => ROLE_LABEL[r as Role] ?? r).join(' · ');

/**
 * The panel around every tab: sign-in, restaurant data, live connection, alerts
 * and banners. It lives in the layout, so it stays mounted while the member moves
 * between tabs; each page only says which roles may open it.
 */
export function PanelShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const base = `/r/${slug}`;
  const pathname = usePathname();
  /** Where signing out leads: Elo support goes back to the restaurant in the Elo panel, not to this login. */
  const leavingTo = useRef<string | null>(null);
  const { token, user, ready, setToken } = useAuth(slug);
  const [me, setMe] = useState<Me | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [failed, setFailed] = useState(false);
  const live = useRealtimeStatus(token, !!me);
  const roleList = user?.roles ?? [];
  const alerts = useAlertsControl({ token, slug, roles: roleList });
  useStaffAlerts({ token, roles: roleList, base, push: alerts.push, enabled: !!me && alerts.enabled });

  // An administrator changed this member's roles or name: swap the token so menus and screens follow, without signing in again.
  useRealtime(
    {
      'staff.updated': (p: { id: string }) => {
        if (!token || p.id !== user?.sub || user?.impersonatedBy) return;
        api<{ accessToken: string }>('/api/auth/refresh', { method: 'POST', body: {}, token })
          .then((res) => setToken(res.accessToken))
          .catch(() => undefined);
        api<{ avatarUrl: string | null }>('/api/me', { token }).then((r) => setAvatarUrl(r.avatarUrl)).catch(() => undefined);
      },
      'restaurant.availability': (a: Availability) => setMe((m) => (m ? { ...m, availability: a } : m)),
    },
    token,
    !!me,
  );

  useEffect(() => {
    if (!token || user?.impersonatedBy) return setAvatarUrl(null);
    api<{ avatarUrl: string | null }>('/api/me', { token }).then((r) => setAvatarUrl(r.avatarUrl)).catch(() => undefined);
  }, [token, user?.impersonatedBy]);

  // Opening hours change on their own: fetch the status again right after the next change.
  const changesAt = me?.availability.changesAt;
  useEffect(() => {
    if (!changesAt || !token) return;
    const wait = new Date(changesAt).getTime() - Date.now() + 1000;
    if (wait > 2 ** 31 - 1) return;
    const timer = setTimeout(() => {
      api<Me>('/api/restaurant/me', { token }).then(setMe).catch(() => undefined);
    }, Math.max(wait, 1000));
    return () => clearTimeout(timer);
  }, [changesAt, token]);

  useEffect(() => {
    if (!ready) return;
    if (!token || !user) return void router.replace(leavingTo.current ?? `${base}/login`);
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
  }, [ready, token, user?.roles.join(','), user?.sub, router, setToken, slug, base]);

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
          <span className="mx-auto grid shrink-0 h-16 w-16 place-items-center rounded-pill bg-warning/20 text-warning">
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
    <Ctx.Provider value={{ token, roles: user.roles, sub: user.sub, impersonated: !!user.impersonatedBy, me, setMe, name: user.name ?? me.name, avatarUrl, setAvatarUrl }}>
      <AppShell
        brandSub={me.name}
        nav={navFor(base, user.roles, !!user.impersonatedBy)}
        user={{ name: user.name ?? me.name, role: user.impersonatedBy ? 'Suporte Elo Digital' : rolesLabel(user.roles), avatarUrl }}
        onLogout={() => {
          // This device stops getting the team's alerts before the next person signs in.
          void alerts.leave();
          if (user.impersonatedBy) leavingTo.current = `/admin/restaurants/${me.id}`;
          setToken(null);
        }}
        defaultCollapsed={user.roles.length === 1 && user.roles[0] === 'kitchen'}
        headerExtra={
          <span className="flex min-w-0 items-center gap-1">
            <LiveIndicator status={live} />
            <span className="ml-auto">{alerts.bell}</span>
          </span>
        }
        links={[{ href: `/${me.slug}`, label: 'Cardápio dos clientes', icon: BookOpen, external: true }]}
        banner={
          <>
          {user.impersonatedBy ? (
            <GlassCard className="mb-5 flex items-start gap-3 border-brand/40 px-4 py-3 text-sm sm:items-center sm:px-5">
              <ShieldAlert size={20} className="shrink-0 text-brand" />
              <span>
                Você está no painel de {me.name} como equipe Elo Digital: pode ver tudo e corrigir cardápio, mesas, equipe e configurações. Pedidos, chamados, mesas em uso e contas ficam com a equipe do restaurante. Use <strong>Sair</strong> para voltar ao painel Elo; o acesso termina em 45 minutos.
              </span>
            </GlassCard>
          ) : warn ? (
            <GlassCard className="mb-5 flex items-start gap-3 border-warning/40 px-4 py-3 text-sm sm:items-center sm:px-5">
              <BellRing size={20} className="shrink-0 text-warning" />
              <span>
                Pagamento vencido em {new Date(me.subscription.dueDate).toLocaleDateString('pt-BR')}. Regularize até{' '}
                <strong>{new Date(me.subscription.graceEndsAt).toLocaleDateString('pt-BR')}</strong> para não suspender o acesso.
              </span>
            </GlassCard>
          ) : null}
          {!me.availability.open && (
            <GlassCard className="mb-5 flex items-start gap-3 border-warning/40 px-4 py-3 text-sm sm:items-center sm:px-5">
              <Clock size={20} className="shrink-0 text-warning" />
              <span>
                <strong>{me.availability.label}</strong>
                {me.availability.pauseReason && <> · {me.availability.pauseReason}</>}. Nenhuma mesa nova abre; as mesas e os pedidos em andamento seguem normalmente.
                {user.roles.some((r) => r === 'restaurant_admin' || r === 'manager') && pathname !== `${base}/dashboard/hours` && (
                  <> <Link href={`${base}/dashboard/hours`} className="font-semibold text-brand underline-offset-2 hover:underline">Ver funcionamento</Link></>
                )}
              </span>
            </GlassCard>
          )}
          {alerts.prompt}
          </>
        }
      >
        {children}
      </AppShell>
    </Ctx.Provider>
  );
}

/** Opens the page only for the given roles; anyone else goes to their own first tab. */
export function RequireRoles({ roles, children }: { roles: string[]; children: ReactNode }) {
  const ctx = useContext(Ctx);
  const router = useRouter();
  const allowed = !!ctx && ctx.roles.some((r) => roles.includes(r));
  useEffect(() => {
    if (ctx && !allowed) router.replace(homeOf(ctx.me.slug, ctx.roles));
  }, [ctx, allowed, router]);
  return allowed ? <>{children}</> : <PageLoading />;
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
