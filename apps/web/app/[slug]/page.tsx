'use client';

import { SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import type { PublicMenuView } from '@elo/core';
import { CategoryTabs, filterMenu, Highlights, MenuList, MenuSearch } from '../_components/menu-list';
import { RestaurantInfo } from '../_components/menu/info';
import { MenuFooter } from '../_components/menu-chrome';
import { MenuHeader } from '../_components/menu/header';
import { Notice } from '../_components/notice';

/** Link fixo do restaurante: apenas consulta do cardápio. */
export default function FixedMenu({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<PublicMenuView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api<PublicMenuView>(`/api/public/${params.slug}/menu`)
      .then(setData)
      .catch((e) => e instanceof ApiError && setNotFound(true));
  }, [params.slug]);

  if (notFound) return <Notice title="Restaurante não encontrado" icon={<SearchX size={30} />}>Confira o endereço do cardápio.</Notice>;
  if (!data)
    return (
      <main className="mx-auto max-w-2xl" aria-busy>
        <div className="skeleton h-36 !rounded-none sm:h-48" />
        <div className="space-y-4 p-4"><div className="skeleton h-8 w-2/3" /><div className="skeleton h-24" /><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
      </main>
    );

  const visible = filterMenu(data.menu, query);
  return (
    <div className="mx-auto min-h-dvh max-w-2xl">
      <MenuHeader name={data.restaurant.name} coverUrl={data.restaurant.coverUrl} logoUrl={data.restaurant.logoUrl}>
        <span className="rounded-pill bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">Somente consulta</span>
        <span>Para pedir, leia o QR Code da sua mesa.</span>
      </MenuHeader>
      <RestaurantInfo profile={data.restaurant} />
      <div className="px-4 pb-1 pt-4"><MenuSearch value={query} onChange={setQuery} /></div>
      {!query && <Highlights menu={data.menu} />}
      <CategoryTabs menu={visible} />
      <MenuList menu={visible} searching={!!query} />
      <div className="px-4 pb-10 pt-6"><MenuFooter name={data.restaurant.name} /></div>
    </div>
  );
}
