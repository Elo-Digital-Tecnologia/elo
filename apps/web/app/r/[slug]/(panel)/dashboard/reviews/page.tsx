'use client';

import { MessageSquareText, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@elo/client';
import type { ReviewSummaryView } from '@elo/core';
import { Button, EmptyState, ErrorState, GlassCard, PageHeader, SkeletonCards } from '@elo/ui';
import { RequireRoles, useStaff } from '../../../_components/shell';

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={16} className={n <= value ? 'fill-accent text-accent' : 'text-line'} />
      ))}
    </span>
  );
}

function Reviews() {
  const { token } = useStaff();
  const [data, setData] = useState<ReviewSummaryView | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<ReviewSummaryView>('/api/reviews', { token }));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar as avaliações.</ErrorState>;
  if (!data) return <SkeletonCards count={3} />;

  return (
    <>
      <PageHeader title="Avaliações" />
      {data.count === 0 ? (
        <EmptyState icon={MessageSquareText} title="Nenhuma avaliação">Os clientes avaliam o atendimento na aba Conta, com a mesa aberta.</EmptyState>
      ) : (
        <>
          <GlassCard strong className="mb-5 flex items-center gap-5 p-6">
            <span className="font-display text-5xl font-extrabold tabular-nums">{data.average.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</span>
            <div>
              <Stars value={Math.round(data.average)} />
              <p className="mt-1 text-sm text-muted">{data.count} {data.count === 1 ? 'avaliação' : 'avaliações'}</p>
            </div>
          </GlassCard>
          <ul className="space-y-3">
            {data.reviews.map((r) => (
              <li key={r.id} className="surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Stars value={r.stars} />
                  <span className="text-xs text-muted">{r.tableName} · {new Date(r.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default function ReviewsPage() {
  return (
    <RequireRoles roles={['restaurant_admin', 'manager']}>
      <Reviews />
    </RequireRoles>
  );
}
