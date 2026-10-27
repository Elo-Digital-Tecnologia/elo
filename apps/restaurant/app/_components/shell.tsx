'use client';

import {
  BellRing,
  ChefHat,
  CreditCard,
  LayoutDashboard,
  Table2,
  UtensilsCrossed,
  Users,
  ConciergeBell,
  ShieldAlert,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, useAuth, useServiceOrigin } from '@elo/client';
import type { SubscriptionView } from '@elo/core';
import { AppShell, Aurora, Button, ErrorState, GlassCard, type NavItem, SkeletonCards } from '@elo/ui';

interface Me {
  id: string;
  slug: string;
  name: string;
  serviceFeeBps: number;
  subscription: SubscriptionView;
}

interface StaffCtx {
  token: string;
  role: string;
  me: Me;
}

const Ctx = createContext<StaffCtx | null>(null);
export const useStaff = () => useContext(Ctx)!;

const ROLE_LABEL: Record<string, string> = {
  restaurant_admin: 'Administrador',
  waiter: 'Garçom',
  kitchen: 'Cozinha',
  cashier: 'Caixa',
};

const NAV: Record<string, NavItem[]> = {
  restaurant_admin: [
    { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
    { href: '/dashboard/menu', label: 'Cardápio', icon: UtensilsCrossed },
    { href: '/dashboard/tables', label: 'Mesas e QR Codes', icon: Table2 },
    { href: '/waiter', label: 'Salão', icon: ConciergeBell },
    { href: '/kitchen', label: 'Cozinha', icon: ChefHat },
    { href: '/dashboard/staff', label: 'Equipe', icon: Users },
    { href: '/dashboard/subscription', label: 'Assinatura', icon: CreditCard },
  ],
  waiter: [{ href: '/waiter', label: 'Salão', icon: ConciergeBell }],
  kitchen: [{ href: '/kitchen', label: 'Cozinha', icon: ChefHat }],
  cashier: [],
};

export const HOME: Record<string, string> = {
  restaurant_admin: '/dashboard',
  waiter: '/waiter',
  kitchen: '/kitchen',
  cashier: '/dashboard',
};

/** Exige login e perfil permitido; mostra aviso de vencimento e bloqueio por suspensão. */
export function Shell({ roles, children }: { roles: string[]; children: ReactNode; bare?: boolean }) {
  const router = useRouter();
  const { token, user, ready, setToken } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [failed, setFailed] = useState(false);
  const menuOrigin = useServiceOrigin(3000, process.env.NEXT_PUBLIC_MENU_URL);

  useEffect(() => {
    if (!ready) return;
    if (!token || !user) return void router.replace('/');
    if (!roles.includes(user.role)) return void router.replace(HOME[user.role] ?? '/');
    api<Me>('/api/restaurant/me', { token })
      .then(setMe)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) setSuspended(true);
        else if (e instanceof ApiError && e.status === 401) setToken(null);
        else setFailed(true);
      });
  }, [ready, token, user, roles, router, setToken]);

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
            O pagamento da assinatura não foi confirmado. Fale com a Elo Digital para reativar o acesso da sua equipe. O cardápio dos clientes continua no ar.
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
    <Ctx.Provider value={{ token, role: user.role, me }}>
      <AppShell
        brandSub="Restaurante"
        nav={NAV[user.role] ?? []}
        user={{ name: me.name, role: ROLE_LABEL[user.role] ?? user.role }}
        onLogout={() => setToken(null)}
        defaultCollapsed={user.role === 'kitchen'}
        headerExtra={
          <span className="flex items-center gap-2 pl-2 text-sm text-muted">
            <span className="pulse-dot" aria-hidden />
            Ao vivo
          </span>
        }
        footerLinks={[{ label: 'Cardápio dos clientes', href: `${menuOrigin}/${me.slug}` }]}
        banner={
          warn ? (
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
