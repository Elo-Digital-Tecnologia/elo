'use client';

import type { PublicMenuView } from '@elo/core/api/views/restaurant.view';
import type { SessionStateView } from '@elo/core/api/views/table.view';
import { api } from '@elo/client/http/api-client';
import { ApiError } from '@elo/client/http/api-error';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { AlertsProvider } from '@elo/ui/components/feedback/alerts';
import { SearchX, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MenuFooter } from '../_components/menu-chrome';
import {
    CategoryTabs,
    Highlights,
    MenuList,
    MenuSearch,
    filterMenu
} from '../_components/menu-list';
import { MenuHeader } from '../_components/menu/header';
import { RestaurantInfo } from '../_components/menu/info';
import { MenuSkeleton } from '../_components/menu/menu-skeleton';
import { Notice } from '../_components/notice';
import { TableMenuView } from '../_components/table/table-menu-view';

/**
 * Fixed restaurant link: read-only menu. A guest whose table session is still valid here
 * (the table link drops its token from the address bar) gets the table back instead.
 */
export default function FixedMenu({ params }: { params: { slug: string } }) {
    const [data, setData] = useState<PublicMenuView | null>(null);
    const [session, setSession] = useState<SessionStateView | null>(null);
    const [missing, setMissing] = useState<'not_found' | 'unavailable' | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        void Promise.allSettled([
            api<PublicMenuView>(`/api/public/${params.slug}/menu`),
            api<SessionStateView>('/api/public/session')
        ]).then(([menu, table]) => {
            const slug =
                menu.status === 'fulfilled' ? menu.value.restaurant.slug : params.slug;
            // Opened from an old link: show the current one in the address bar.
            if (slug !== params.slug) window.history.replaceState(null, '', `/${slug}`);
            if (table.status === 'fulfilled' && table.value.restaurant.slug === slug)
                setSession(table.value);
            else if (menu.status === 'fulfilled') setData(menu.value);
            else if (menu.reason instanceof ApiError)
                setMissing(
                    menu.reason.code === ApiErrorCode.MENU_UNAVAILABLE
                        ? 'unavailable'
                        : 'not_found'
                );
        });
    }, [params.slug]);

    if (session)
        return (
            <AlertsProvider>
                <TableMenuView initial={session} />
            </AlertsProvider>
        );

    if (missing === 'unavailable')
        return (
            <Notice title="Cardápio indisponível no momento" icon={<Store size={30} />}>
                Este cardápio está fora do ar. Tente de novo mais tarde.
            </Notice>
        );
    if (missing)
        return (
            <Notice title="Restaurante não encontrado" icon={<SearchX size={30} />}>
                Confira o endereço do cardápio.
            </Notice>
        );
    if (!data) return <MenuSkeleton />;

    const visible = filterMenu(data.menu, query);
    return (
        <div className="mx-auto min-h-dvh max-w-2xl">
            <MenuHeader
                name={data.restaurant.name}
                coverUrl={data.restaurant.coverUrl}
                logoUrl={data.restaurant.logoUrl}
            >
                <span className="rounded-pill bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                    Somente consulta
                </span>
                <span>Para pedir, leia o QR Code da sua mesa.</span>
            </MenuHeader>
            <RestaurantInfo profile={data.restaurant} />
            <div className="px-4 pb-1 pt-4">
                <MenuSearch value={query} onChange={setQuery} />
            </div>
            {!query && <Highlights menu={data.menu} />}
            <CategoryTabs menu={visible} />
            <MenuList menu={visible} searching={!!query} />
            <div className="px-4 pb-10 pt-6">
                <MenuFooter name={data.restaurant.name} />
            </div>
        </div>
    );
}
