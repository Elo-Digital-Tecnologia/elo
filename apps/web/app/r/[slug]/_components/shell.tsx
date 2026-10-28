'use client';

import {
  BarChart3,
  BellRing,
  ChefHat,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Receipt,
  Settings,
  Table2,
  UtensilsCrossed,
  Users,
  ConciergeBell,
  ShieldAlert,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, useAuth } from '@elo/client';
import type { SubscriptionView } from '@elo/core';
import { AppShell, Aurora, Button, ErrorState, GlassCard, type NavItem, SkeletonCards } from '@elo/ui';

interface Me {
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
  role: string;
  me: Me;
  /** Atualiza os dados do restaurante após editar as configurações. */
  setMe: (me: Me) => void;
}

const Ctx = createContext<StaffCtx | null>(null);
export const useStaff = () => useContext(Ctx)!;

const ROLE_LABEL: Record<string, string> = {
  restaurant_admin: 'Administrador',
  waiter: 'Garçom',
  kitchen: 'Cozinha',
  cashier: 'Caixa',
};

const HOME_PATH: Record<string, string> = {
  restaurant_admin: '/dashboard',
  waiter: '/waiter',
  kitchen: '/kitchen',
  cashier: '/cashier',
};

/** Página inicial de cada perfil dentro do restaurante. */
export const homeOf = (slug: string, role: string) => `/r/${slug}${HOME_PATH[role] ?? '/login'}`;

function navFor(base: string, role: string): NavItem[] {
  const item = (path: string, label: string, icon: NavItem['icon']): NavItem => ({ href: base + path, label, icon });
  const account = item('/account', 'Minha conta', KeyRound);
  const salon = item('/waiter', 'Salão', ConciergeBell);
  const cashier = item('/cashier', 'Caixa', Receipt);
  const kitchen = item('/kitchen', 'Cozinha', ChefHat);
  switch (role) {
    case 'restaurant_admin':
      return [
        item('/dashboard', 'Visão geral', LayoutDashboard),
        item('/dashboard/reports', 'Relatórios', BarChart3),
        item('/dashboard/menu', 'Cardápio', UtensilsCrossed),
        item('/dashboard/tables', 'Mesas e QR Codes', Table2),
        salon,
        cashier,
        kitchen,
        item('/dashboard/staff', 'Equipe', Users),
        item('/dashboard/settings', 'Configurações', Settings),
        item('/dashboard/subscription', 'Assinatura', CreditCard),
        account,
      ];
    case 'waiter':
      return [salon, cashier, account];
    case 'kitchen':
      return [kitchen, account];
    case 'cashier':
      return [cashier, account];
    default:
      return [];
  }
}

/** Exige login e perfil permitido; mostra aviso de vencimento e bloqueio por suspensão. */
export function Shell({ roles, children }: { roles: string[]; children: ReactNode; bare?: boolean }) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const base = `/r/${slug}`;
  const { token, user, ready, setToken } = useAuth(slug);
  const [me, setMe] = useState<Me | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token || !user) return void router.replace(`${base}/login`);
    if (!roles.includes(user.role)) return void router.replace(homeOf(slug, user.role));
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
  }, [ready, token, user?.role, user?.sub, roles.join(','), router, setToken, slug, base]);

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
    <Ctx.Provider value={{ token, role: user.role, me, setMe }}>
      <AppShell
        brandSub="Restaurante"
        nav={navFor(base, user.role)}
        user={{ name: me.name, role: ROLE_LABEL[user.role] ?? user.role }}
        onLogout={() => {
          setToken(null);
          // Quem entrou pelo painel Elo volta para ele.
          if (user.impersonatedBy) router.replace(`/admin/restaurants/${me.id}`);
        }}
        defaultCollapsed={user.role === 'kitchen'}
        headerExtra={
          <span className="flex items-center gap-2 pl-2 text-sm text-muted">
            <span className="pulse-dot" aria-hidden />
            Ao vivo
          </span>
        }
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
