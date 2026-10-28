'use client';

import { Check, ChefHat, Send, Soup, X } from 'lucide-react';
import type { OrderStatus, OrderView } from '@elo/core';
import { Badge, GlassCard, motion } from '@elo/ui';

const STEPS: { status: OrderStatus; label: string; icon: typeof Send }[] = [
  { status: 'sent', label: 'Enviado', icon: Send },
  { status: 'received', label: 'Recebido', icon: ChefHat },
  { status: 'preparing', label: 'Em preparo', icon: Soup },
  { status: 'ready', label: 'Pronto', icon: Check },
];

/** Acompanhamento do pedido: o passo atual pulsa; os anteriores ficam preenchidos. */
export function OrderTracker({ order, onCancel }: { order: OrderView; onCancel: () => void }) {
  const cancelled = order.status === 'cancelled';
  const returned = order.status === 'returned';
  const current = STEPS.findIndex((s) => s.status === order.status);
  const cancellable = order.status === 'sent' || order.status === 'received';

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <ul className="space-y-0.5 text-sm">
          {order.items.map((i, idx) => (
            <li key={idx}>
              <span className="font-bold">{i.quantity}x</span> {i.name}
              {i.options.length > 0 && <span className="text-muted"> · {i.options.map((o) => o.label).join(', ')}</span>}
            </li>
          ))}
        </ul>
        {cancelled ? <Badge tone="danger">Cancelado</Badge> : returned ? <Badge tone="danger">Devolvido</Badge> : cancellable ? <button className="shrink-0 text-sm font-medium text-danger hover:underline" onClick={onCancel}>Cancelar</button> : null}
      </div>

      {returned ? (
        <p className="flex items-center gap-2 text-sm text-muted"><X size={16} className="text-danger" /> Este pedido foi devolvido{order.cancelReason ? `: ${order.cancelReason}` : '.'} Ele não entra na conta.</p>
      ) : cancelled ? (
        <p className="flex items-center gap-2 text-sm text-muted"><X size={16} className="text-danger" /> Este pedido foi cancelado{order.cancelReason ? `: ${order.cancelReason}` : '.'}</p>
      ) : (
        <ol className="relative grid grid-cols-4" aria-label="Etapas do pedido">
          <span className="absolute left-[12.5%] right-[12.5%] top-5 h-1 rounded-pill bg-leaf-200/70" aria-hidden />
          <motion.span className="absolute left-[12.5%] top-5 h-1 rounded-pill bg-brand" aria-hidden initial={{ width: 0 }} animate={{ width: `${(current / 3) * 75}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
          {STEPS.map((s, i) => {
            const done = i < current;
            const now = i === current;
            const Icon = s.icon;
            return (
              <li key={s.status} className="relative flex flex-col items-center gap-2 text-center" aria-current={now ? 'step' : undefined}>
                <span className={`relative grid h-10 w-10 place-items-center rounded-pill transition-colors duration-500 ${done || now ? 'btn-glass' : 'bg-leaf-100 text-muted'}`}>
                  {done ? <Check size={18} /> : <Icon size={18} />}
                  {now && order.status !== 'ready' && <span className="absolute inset-0 animate-ping rounded-pill bg-brand/40" aria-hidden />}
                </span>
                <span className={`text-xs font-semibold ${now ? 'text-fg' : 'text-muted'}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </GlassCard>
  );
}
