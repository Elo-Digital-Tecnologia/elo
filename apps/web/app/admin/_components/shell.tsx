'use client';

import { Building2, LayoutDashboard, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useAuth, useServiceOrigin } from '@elo/client';
import type { Permission } from '@elo/core';
import { AppShell, Aurora, type NavItem, SkeletonCards } from '@elo/ui';

interface AdminCtx {
  token: string;
  role: string;
  can: (p: Permission) => boolean;
}

const Ctx = createContext<AdminCtx | null>(null);
export const useAdmin = () => useContext(Ctx)!;

const NAV: (NavItem & { perm?: Permission })[] = [
  { href: '/admin/overview', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'Restaurantes', icon: Building2, perm: 'restaurants' },
  { href: '/admin/team', label: 'Equipe', icon: UsersRound, perm: 'settings' },
];

/** Exige login de equipe Elo Digital; itens do menu seguem as permissões. */
export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token, user, ready, setToken } = useAuth('admin');
  const apiOrigin = useServiceOrigin(3001, process.env.NEXT_PUBLIC_API_URL);
  const isElo = user && (user.role === 'superadmin' || user.role === 'elo_admin');

  useEffect(() => {
    if (ready && !isElo) router.replace('/admin');
  }, [ready, isElo, router]);

  if (!token || !user || !isElo)
    return (
      <main className="relative min-h-dvh p-6">
        <Aurora />
        <div className="mx-auto max-w-5xl pt-16"><SkeletonCards count={3} /></div>
      </main>
    );

  const can = (p: Permission) => user.role === 'superadmin' || user.permissions.includes(p);
  return (
    <Ctx.Provider value={{ token, role: user.role, can }}>
      <AppShell
        brandSub="Administração"
        nav={NAV.filter((n) => !n.perm || can(n.perm))}
        user={{ name: user.role === 'superadmin' ? 'Superadmin' : 'Equipe Elo', role: user.role === 'superadmin' ? 'Todas as permissões' : `${user.permissions.length} permissões` }}
        onLogout={() => setToken(null)}
        footerLinks={[{ label: 'Documentação da API', href: `${apiOrigin}/docs` }]}
      >
        {children}
      </AppShell>
    </Ctx.Provider>
  );
}
