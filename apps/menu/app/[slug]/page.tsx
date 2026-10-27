'use client';

import { SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@elo/client';
import type { PublicMenuView } from '@elo/core';
import { Aurora, Badge, GlassCard, Logo, ThemeToggle } from '@elo/ui';
import { CategoryNav, MenuList } from '../_components/menu-list';
import { Notice } from '../_components/notice';

/** Link fixo do restaurante: apenas consulta do cardápio. */
export default function FixedMenu({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<PublicMenuView | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api<PublicMenuView>(`/api/public/${params.slug}/menu`)
      .then(setData)
      .catch((e) => e instanceof ApiError && setNotFound(true));
  }, [params.slug]);

  if (notFound) return <Notice title="Restaurante não encontrado" icon={<SearchX size={30} />}>Confira o endereço do cardápio.</Notice>;
  if (!data)
    return (
      <main className="relative min-h-dvh p-4"><Aurora /><div className="mx-auto max-w-3xl space-y-4 pt-4"><div className="skeleton h-36" /><div className="skeleton h-28" /><div className="skeleton h-28" /></div></main>
    );
  return (
    <div className="relative min-h-dvh">
      <Aurora />
      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-16 pt-4">
        <GlassCard strong className="!rounded-xl p-6 sm:p-8">
          <div className="flex items-start justify-between"><Logo /><ThemeToggle /></div>
          <h1 className="mt-8 text-5xl font-extrabold leading-[0.98] sm:text-6xl">{data.restaurant.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge tone="brand">Somente consulta</Badge>
            <span className="text-sm text-muted">Para pedir, escaneie o QR Code da sua mesa.</span>
          </div>
        </GlassCard>
        <CategoryNav menu={data.menu} />
        <MenuList menu={data.menu} />
      </main>
    </div>
  );
}
