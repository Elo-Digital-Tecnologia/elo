'use client';

import { CreditCard, History, KeyRound, Settings, ShieldCheck, Store, Table2, Users, UtensilsCrossed } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@elo/client';
import { ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES, type ActivityCategory, type ActivityPage, type ActivityView, formatBRL, ROLE_LABEL, type Role } from '@elo/core';
import { Badge, Button, EmptyState, ErrorState, Pagination, SkeletonCards } from '@elo/ui';

const ICON: Record<ActivityCategory, typeof History> = {
  tables: Table2,
  orders: UtensilsCrossed,
  team: Users,
  payments: CreditCard,
  settings: Settings,
  restaurant: Store,
  support: ShieldCheck,
};

/** Field names as the settings screens call them. */
const FIELD: Record<string, string> = {
  name: 'nome',
  managerName: 'responsável pelo contrato',
  managerContact: 'contato do responsável',
  serviceFeeBps: 'taxa de serviço',
  guestFeeRefusal: 'recusa da taxa pelo cliente',
  description: 'descrição',
  logoUrl: 'logo',
  coverUrl: 'capa',
  address: 'endereço',
  phone: 'telefone',
  instagram: 'Instagram',
  wifiName: 'nome do Wi-Fi',
  wifiPassword: 'senha do Wi-Fi',
  openingHours: 'horários',
  amountCents: 'valor',
  paidAt: 'data do pagamento',
  note: 'observação',
};

const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

const roles = (v: unknown) => (Array.isArray(v) ? v.map((r) => ROLE_LABEL[r as Role] ?? r).join(', ') : '');

/** One line of detail per record, from what was stored with it (values of settings are never stored). */
function detail(a: ActivityView): string | null {
  const m = a.meta ?? {};
  if (Array.isArray(m.fields)) return `Alterou: ${(m.fields as string[]).map((f) => FIELD[f] ?? f).join(', ')}.`;
  const reason = typeof m.reason === 'string' ? `Motivo: ${m.reason}` : null;
  if (a.action === 'due_date_adjusted' && typeof m.newDueDate === 'string') {
    const from = typeof m.from === 'string' ? `de ${day(m.from)} ` : '';
    return [`Vencimento ${from}para ${day(m.newDueDate)}`, reason].filter(Boolean).join(' · ');
  }
  if (a.action === 'pause_created' && typeof m.startsAt === 'string') {
    const stamp = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const span = typeof m.endsAt === 'string' ? `${stamp(m.startsAt)} até ${stamp(m.endsAt)}` : `desde ${stamp(m.startsAt)}, até reabrir`;
    return [span, reason].filter(Boolean).join(' · ');
  }
  if (a.action === 'pause_ended') return m.running === false ? 'Cancelada antes de começar.' : 'Restaurante reaberto.';
  if (a.action === 'ownership_transferred') {
    return [typeof m.formerOwner === 'string' ? `Antes: ${m.formerOwner}` : null, reason].filter(Boolean).join(' · ') || null;
  }
  if (a.action === 'plan_changed') return typeof m.from === 'string' ? `Antes: ${m.from}.` : null;
  if (a.action === 'payment_voided') {
    const amount = typeof m.amountCents === 'number' && m.amountCents > 0 ? formatBRL(m.amountCents) : null;
    const due = typeof m.newDueDate === 'string' ? `vencimento volta para ${day(m.newDueDate)}` : null;
    return [amount, due, reason].filter(Boolean).join(' · ');
  }
  if (typeof m.amountCents === 'number') {
    const due = typeof m.newDueDate === 'string' ? `novo vencimento ${day(m.newDueDate)}` : null;
    return [formatBRL(m.amountCents), due].filter(Boolean).join(' · ');
  }
  if (m.from && m.to) return `${roles(m.from)} → ${roles(m.to)}`;
  if (typeof m.from === 'string') return `Estava com ${m.from}.`;
  if (typeof m.formerName === 'string') return `Antes: ${m.formerName}.`;
  if (Array.isArray(m.roles)) return `Perfis: ${roles(m.roles)}.`;
  const parts = [typeof m.items === 'string' ? m.items : null, typeof m.reason === 'string' ? `Motivo: ${m.reason}` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

const PAGE_SIZE = 10;

const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Activity log of one restaurant, newest first, filterable by kind. */
export function ActivityList({ endpoint, token }: { endpoint: string; token: string | null }) {
  const [category, setCategory] = useState<ActivityCategory | ''>('');
  const [items, setItems] = useState<ActivityView[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const block = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (p: number) => {
      setBusy(true);
      try {
        const qs = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
        if (category) qs.set('category', category);
        const res = await api<ActivityPage>(`${endpoint}?${qs}`, { token });
        setItems(res.items);
        setTotal(res.total);
        setPage(p);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setBusy(false);
      }
    },
    [endpoint, token, category],
  );

  useEffect(() => {
    setItems(null);
    void load(1);
  }, [load]);

  const turn = (p: number) => {
    void load(p);
    // Keep the reader at the top of the block, not at the pager below it.
    if (block.current && block.current.getBoundingClientRect().top < 0) block.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chips: [ActivityCategory | '', string][] = [['', 'Tudo'], ...(Object.entries(ACTIVITY_CATEGORIES) as [ActivityCategory, string][])];

  return (
    <div ref={block} className="scroll-mt-24">
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 scroll-soft sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Tipo de registro">
        {chips.map(([key, label]) => (
          <button key={key || 'all'} aria-pressed={category === key} onClick={() => setCategory(key)} className={`shrink-0 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition ${category === key ? 'border-brand bg-brand text-brand-fg' : 'border-line/60 text-muted hover:border-brand/60 hover:text-fg'}`}>
            {label}
          </button>
        ))}
      </div>
      {failed && !items && <ErrorState action={<Button onClick={() => load(1)}>Tentar de novo</Button>}>Não foi possível carregar os registros.</ErrorState>}
      {!items && !failed && <SkeletonCards count={3} />}
      {items?.length === 0 && <EmptyState icon={History} title="Nenhum registro">As ações da equipe e da Elo Digital aparecem aqui.</EmptyState>}
      {items && items.length > 0 && (
        <ol className={`space-y-2 transition-opacity ${busy ? 'pointer-events-none opacity-50' : ''}`} aria-busy={busy}>
          {items.map((a) => {
            const spec = ACTIVITY_ACTIONS[a.action];
            const Icon = spec ? ICON[spec.category] : KeyRound;
            const extra = detail(a);
            return (
              <li key={a.id} className="surface flex gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-brand/15 text-brand"><Icon size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="min-w-0 font-medium">
                      {spec?.label ?? a.action}
                      {a.target && <span className="text-muted"> · {a.target}</span>}
                    </p>
                    <time dateTime={a.createdAt} className="shrink-0 text-xs text-muted tabular-nums">{when(a.createdAt)}</time>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span className="truncate">por {a.actorName}</span>
                    {a.actorKind === 'elo' && <Badge tone="info">Elo Digital</Badge>}
                  </p>
                  {extra && <p className="mt-1 break-words text-sm">{extra}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {failed && items && <p role="alert" className="mt-3 text-sm text-danger">Não foi possível carregar essa página. Tente de novo.</p>}
      {items && total > 0 && <Pagination className="mt-4" page={page} pageSize={PAGE_SIZE} total={total} onPage={turn} />}
    </div>
  );
}
