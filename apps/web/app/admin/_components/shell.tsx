'use client';

import type { Permission } from '@elo/core/roles/permissions';
import type { NavItem } from '@elo/ui/components/layout/app-shell';
import type { ReactNode } from 'react';
import { useServiceOrigin } from '@elo/client/origin/service-origin';
import { useAuth } from '@elo/client/session/auth';
import { upgradePermissions } from '@elo/core/roles/permissions';
import { SkeletonCards } from '@elo/ui/components/feedback/states';
import { AppShell } from '@elo/ui/components/layout/app-shell';
import { Aurora } from '@elo/ui/components/motion/aurora';
import { BookOpen, Building2, Layers, LayoutDashboard, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect } from 'react';

interface AdminCtx {
    token: string;
    roles: string[];
    /** Signed-in member id ('superadmin' for the superadmin). */
    sub: string;
    can: (p: Permission) => boolean;
}

const Ctx = createContext<AdminCtx | null>(null);
export const useAdmin = () => useContext(Ctx)!;

const NAV: (NavItem & { perm?: Permission })[] = [
    { href: '/admin/overview', label: 'Visão geral', icon: LayoutDashboard },
    {
        href: '/admin/restaurants',
        label: 'Restaurantes',
        icon: Building2,
        perm: 'restaurants.view'
    },
    { href: '/admin/plans', label: 'Planos', icon: Layers, perm: 'payments.view' },
    { href: '/admin/team', label: 'Equipe', icon: UsersRound, perm: 'team.manage' }
];

/** The hosted API may keep its docs closed (`API_DOCS`); the web build then hides the link. */
const API_DOCS = process.env.NEXT_PUBLIC_API_DOCS !== 'false';

/** Requires an Elo Digital team sign-in; menu items follow the permissions. Lives in the layout and does not remount between tabs. */
export function AdminShell({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { token, user, ready, logout } = useAuth('admin');
    const apiOrigin = useServiceOrigin(3001, process.env.NEXT_PUBLIC_API_URL);
    const isElo =
        user && (user.roles.includes('superadmin') || user.roles.includes('elo_admin'));

    useEffect(() => {
        if (ready && !isElo) router.replace('/admin');
    }, [ready, isElo, router]);

    if (!token || !user || !isElo)
        return (
            <main className="relative min-h-dvh p-6">
                <Aurora />
                <div className="mx-auto max-w-5xl pt-16">
                    <SkeletonCards count={3} />
                </div>
            </main>
        );

    const isSuper = user.roles.includes('superadmin');
    const permissions = upgradePermissions(user.permissions);
    const can = (p: Permission) => isSuper || permissions.includes(p);
    return (
        <Ctx.Provider value={{ token, roles: user.roles, sub: user.sub, can }}>
            <AppShell
                brandSub="Administração"
                nav={NAV.filter((n) => !n.perm || can(n.perm))}
                user={{
                    name: user.name ?? (isSuper ? 'Superadmin' : 'Equipe Elo'),
                    role: isSuper
                        ? 'Todas as permissões'
                        : `${permissions.length} permissões`
                }}
                onLogout={() => void logout()}
                links={
                    API_DOCS
                        ? [
                              {
                                  href: `${apiOrigin}/docs`,
                                  label: 'Documentação da API',
                                  icon: BookOpen,
                                  external: true
                              }
                          ]
                        : []
                }
            >
                {children}
            </AppShell>
        </Ctx.Provider>
    );
}
