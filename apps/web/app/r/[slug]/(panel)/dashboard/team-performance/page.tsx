'use client';

import { BellRing, DoorOpen, Timer, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@elo/client';
import { formatDuration, type StaffPerformanceRow, type StaffReportView } from '@elo/core';
import { Badge, BarList, Button, DataTable, EmptyState, ErrorState, GlassCard, PageHeader, SkeletonCards, Stagger, StaggerItem, Stat } from '@elo/ui';
import { RequireRoles, useStaff } from '../../../_components/shell';

const ymd = (d: Date) => d.toLocaleDateString('sv-SE');
const daysAgo = (n: number) => ymd(new Date(Date.now() - n * 86_400_000));

const PERIODS = [
  ['Hoje', 0],
  ['7 dias', 6],
  ['30 dias', 29],
] as const;

type SortKey = 'total' | 'calls' | 'speed' | 'name';
const SORTS: [SortKey, string][] = [
  ['total', 'Mais atendimentos'],
  ['calls', 'Mais chamados'],
  ['speed', 'Resposta mais rápida'],
  ['name', 'Nome'],
];

const total = (r: StaffPerformanceRow) => r.callsAnswered + r.tablesOpened + r.tablesClosed;

/** Weighted average of the per-person averages, by how many events each one covers. */
function weighted(rows: StaffPerformanceRow[], value: (r: StaffPerformanceRow) => number | null, weight: (r: StaffPerformanceRow) => number) {
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    const v = value(r);
    if (v === null) continue;
    sum += v * weight(r);
    n += weight(r);
  }
  return n ? sum / n : null;
}

function Performance() {
  const { token } = useStaff();
  const [back, setBack] = useState<number>(6);
  const [sort, setSort] = useState<SortKey>('total');
  const [data, setData] = useState<StaffReportView | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setData(await api<StaffReportView>(`/api/reports/staff?from=${daysAgo(back)}&to=${ymd(new Date())}`, { token }));
    } catch {
      setFailed(true);
    }
  }, [token, back]);
  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const list = [...(data?.rows ?? [])];
    const speed = (r: StaffPerformanceRow) => r.avgCallSeconds ?? Number.POSITIVE_INFINITY;
    list.sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : sort === 'calls' ? b.callsAnswered - a.callsAnswered : sort === 'speed' ? speed(a) - speed(b) : total(b) - total(a),
    );
    return list;
  }, [data, sort]);

  const calls = rows.reduce((n, r) => n + r.callsAnswered, 0);
  const opened = rows.reduce((n, r) => n + r.tablesOpened, 0);
  const callWait = weighted(rows, (r) => r.avgCallSeconds, (r) => r.callsAnswered);
  const openWait = weighted(rows, (r) => r.avgOpenSeconds, (r) => r.tablesOpened);

  return (
    <>
      <PageHeader
        title="Desempenho dos garçons"
        description="Chamados atendidos e mesas abertas e fechadas por cada garçom."
        actions={
          <div className="surface flex !rounded-pill p-1 text-sm font-semibold" role="tablist" aria-label="Período">
            {PERIODS.map(([label, n]) => (
              <button key={label} role="tab" aria-selected={back === n} onClick={() => setBack(n)} className={`rounded-pill px-3.5 py-2 transition ${back === n ? 'bg-brand text-brand-fg' : 'text-muted hover:text-fg'}`}>
                {label}
              </button>
            ))}
          </div>
        }
      />
      {failed && <ErrorState action={<Button onClick={load}>Tentar de novo</Button>}>Não foi possível carregar o desempenho.</ErrorState>}
      {!failed && !data && <SkeletonCards count={3} />}
      {data && (
        <>
          <Stagger className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem><Stat label="Chamados atendidos" value={calls} icon={BellRing} /></StaggerItem>
            <StaggerItem><Stat label="Resposta ao chamado" value={callWait ?? 0} format={() => formatDuration(callWait)} icon={Timer} hint="Média do chamado até alguém atender" /></StaggerItem>
            <StaggerItem><Stat label="Mesas abertas" value={opened} icon={DoorOpen} /></StaggerItem>
            <StaggerItem><Stat label="Espera pela abertura" value={openWait ?? 0} format={() => formatDuration(openWait)} icon={Timer} hint="Média do pedido do cliente até a validação" /></StaggerItem>
          </Stagger>

          {!rows.some((r) => total(r) > 0) ? (
            <EmptyState icon={Trophy} title="Sem atendimentos no período">Chamados, aberturas e fechamentos de mesa dos garçons aparecem aqui.</EmptyState>
          ) : (
            <div className="space-y-6">
              {calls > 0 && (
                <GlassCard className="p-5">
                  <h2 className="mb-4 font-semibold">Chamados por pessoa</h2>
                  <BarList data={rows.filter((r) => r.callsAnswered > 0).map((r) => ({ label: r.name, value: r.callsAnswered }))} />
                </GlassCard>
              )}
              <section className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <h2 className="text-lg font-semibold">Atendimentos por garçom</h2>
                  <span className="flex items-center gap-2">
                  <label htmlFor="sort" className="text-muted">Ordenar por</label>
                  <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="!w-auto">
                    {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  </span>
                </div>
                <DataTable
                  rows={rows}
                  rowKey={(r) => r.id}
                  mobile="cards"
                  columns={[
                    {
                      key: 'n',
                      header: 'Garçom',
                      mobile: 'title',
                      cell: (r) => (
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold">{r.name}</span>
                          {r.archived && <Badge>Excluído</Badge>}
                        </span>
                      ),
                    },
                    { key: 'c', header: 'Chamados', align: 'right', cell: (r) => <span className="tabular-nums">{r.callsAnswered}</span> },
                    { key: 'cs', header: 'Resposta', align: 'right', cell: (r) => <span className="tabular-nums">{formatDuration(r.avgCallSeconds)}</span> },
                    { key: 'o', header: 'Abertas', align: 'right', cell: (r) => <span className="tabular-nums">{r.tablesOpened}</span> },
                    { key: 'os', header: 'Espera', align: 'right', cell: (r) => <span className="tabular-nums">{formatDuration(r.avgOpenSeconds)}</span> },
                    { key: 'f', header: 'Fechadas', align: 'right', cell: (r) => <span className="tabular-nums">{r.tablesClosed}</span> },
                  ]}
                />
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function TeamPerformancePage() {
  return (
    <RequireRoles roles={['restaurant_admin', 'manager']}>
      <Performance />
    </RequireRoles>
  );
}
