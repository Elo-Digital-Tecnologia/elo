'use client';

import { Percent } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@elo/client';
import { type BillView, formatBRL } from '@elo/core';
import { Button, Modal } from '@elo/ui';

/** Conta da mesa vista pelo cliente. A taxa de serviço pode ser recusada por ele. */
export function BillSheet({ open, onClose, version }: { open: boolean; onClose: () => void; version: number }) {
  const [bill, setBill] = useState<BillView | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    api<BillView>('/api/public/session/bill')
      .then((b) => {
        setBill(b);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [open, version]);

  const toggleFee = async () => {
    if (!bill) return;
    setBusy(true);
    try {
      setBill(await api<BillView>('/api/public/session/bill/fee', { body: { refuse: bill.feeWaivedBy === null } }));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Sua conta" sheet>
      {failed && !bill && <p className="text-sm text-danger">Não foi possível carregar a conta. Tente de novo.</p>}
      {bill && bill.lines.length === 0 && <p className="rounded-md bg-leaf-100/40 px-4 py-6 text-center text-sm text-muted">Ainda não há pedidos válidos na conta.</p>}
      {bill && bill.lines.length > 0 && (
        <>
          <ul className="space-y-2 text-sm">
            {bill.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span><span className="font-semibold">{l.quantity}x</span> {l.name}{l.details.length > 0 && <span className="block text-xs text-muted">{l.details.join(' · ')}</span>}</span>
                <span className="tabular-nums">{formatBRL(l.unitCents * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-line/40 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatBRL(bill.subtotalCents)}</dd></div>
            {bill.serviceFeeBps > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Taxa de serviço ({bill.serviceFeeBps / 100}%)</dt>
                <dd className={`tabular-nums ${bill.feeWaivedBy ? 'line-through text-muted' : ''}`}>{formatBRL(Math.round((bill.subtotalCents * bill.serviceFeeBps) / 10_000))}</dd>
              </div>
            )}
            {bill.adjustments.map((a, i) => (
              <div key={i} className="flex justify-between"><dt className="text-muted">{a.label}</dt><dd className="tabular-nums">{a.cents < 0 ? '−' : '+'} {formatBRL(Math.abs(a.cents))}</dd></div>
            ))}
            <div className="flex items-baseline justify-between pt-2"><dt className="font-semibold">Total</dt><dd className="font-display text-2xl font-bold tabular-nums">{formatBRL(bill.totalCents)}</dd></div>
          </dl>
          {bill.serviceFeeBps > 0 && bill.feeWaivedBy !== 'staff' && (
            <Button className="mt-4 w-full" variant="soft" loading={busy} onClick={toggleFee}>
              <Percent size={16} /> {bill.feeWaivedBy === 'customer' ? 'Aceitar a taxa de serviço' : 'Recusar a taxa de serviço'}
            </Button>
          )}
          {bill.feeWaivedBy === 'staff' && <p className="mt-4 text-xs text-muted">A taxa de serviço foi retirada pelo atendimento.</p>}
          <p className="mt-3 text-xs text-muted">O pagamento é feito presencialmente com o garçom.</p>
        </>
      )}
    </Modal>
  );
}
