'use client';

import { BellRing, DoorOpen, Timer, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@elo/client';
import { formatDuration, ROLE_LABEL, type StaffPerformanceRow, type StaffReportView } from '@elo/core';
import { Badge, BarList, Button, DataTable, EmptyState, ErrorState, GlassCard, PageHeader, SkeletonCards, Stagger, StaggerItem, Stat } from '@elo/ui';
import { Shell, useStaff } from '../../_components/shell';

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

  // Kitchen and cashier have no service numbers: they only show up here with recorded activity.
  const active = rows.filter((r) => total(r) > 0 || r.roles.includes('waiter'));
  const calls = active.reduce((n, r) => n + r.callsAnswered, 0);
  const opened = active.reduce((n, r) => n + r.tablesOpened, 0);
  const callWait = weighted(active, (r) => r.avgCallSeconds, (r) => r.callsAnswered);
  const openWait = weighted(active, (r) => r.avgOpenSeconds, (r) => r.tablesOpened);

  return (
    <>
      <PageHeader
        title="Desempenho da equipe"
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

          {!active.some((r) => total(r) > 0) ? (
            <EmptyState icon={Trophy} title="Sem atendimentos no período">Chamados, aberturas e fechamentos de mesa aparecem aqui.</EmptyState>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
              <div className="min-w-0">
                <div className="mb-3 flex items-center justify-end gap-2 text-sm">
                  <label htmlFor="sort" className="text-muted">Ordenar por</label>
                  <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="!w-auto">
                    {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <DataTable
                  rows={rows}
                  rowKey={(r) => r.id}
                  columns={[
                    {
                      key: 'n',
                      header: 'Pessoa',
                      cell: (r) => (
                        <span className="block min-w-0">
                          <span className="block truncate font-semibold">{r.name}</span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {r.archived ? <Badge>Excluído</Badge> : r.roles.map((x) => <Badge key={x} tone="brand">{ROLE_LABEL[x] ?? x}</Badge>)}
                          </span>
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
              </div>
              <GlassCard className="h-fit p-5">
                <h2 className="mb-4 font-semibold">Chamados por pessoa</h2>
                <BarList data={active.filter((r) => r.callsAnswered > 0).map((r) => ({ label: r.name, value: r.callsAnswered }))} />
                {calls === 0 && <p className="text-sm text-muted">Nenhum chamado atendido no período.</p>}
              </GlassCard>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function TeamPerformancePage() {
  return (
    <Shell roles={['restaurant_admin']}>
      <Performance />
    </Shell>
  );
}
