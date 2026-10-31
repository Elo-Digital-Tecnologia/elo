'use client';

import { Percent } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '@elo/client';
import { type BillView, formatBRL } from '@elo/core';
import { Button } from '@elo/ui';
import { unexpected } from '../_lib/use-form';

/** Conta da mesa vista pelo cliente. Quando o restaurante permite, ele mesmo recusa a taxa de serviço. */
export function BillPanel({ active, version, children }: { active: boolean; version: number; children?: ReactNode }) {
  const [bill, setBill] = useState<BillView | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    api<BillView>('/api/public/session/bill')
      .then((b) => {
        setBill(b);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [active, version]);

  const toggleFee = async () => {
    if (!bill) return;
    setBusy(true);
    setFeeError(null);
    try {
      setBill(await api<BillView>('/api/public/session/bill/fee', { body: { refuse: bill.feeWaivedBy === null } }));
    } catch (e) {
      setFeeError(
        e instanceof ApiError && e.code === 'fee_refusal_disabled'
          ? 'Este restaurante não permite retirar a taxa de serviço por aqui. Fale com o garçom.'
          : unexpected(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pt-5">
      {failed && !bill && <p className="text-sm text-danger">Não foi possível carregar a conta. Tente de novo.</p>}
      {bill && bill.lines.length === 0 && <p className="surface px-4 py-8 text-center text-sm text-muted">Ainda não há pedidos na conta.</p>}
      {bill && bill.lines.length > 0 && (
        <div className="surface p-4">
          <ul className="space-y-2.5 text-sm">
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
                <dd className={`tabular-nums ${bill.feeWaivedBy ? 'text-muted line-through' : ''}`}>{formatBRL(Math.round((bill.subtotalCents * bill.serviceFeeBps) / 10_000))}</dd>
              </div>
            )}
            {bill.adjustments.map((a, i) => (
              <div key={i} className="flex justify-between"><dt className="text-muted">{a.label}</dt><dd className="tabular-nums">{a.cents < 0 ? '−' : '+'} {formatBRL(Math.abs(a.cents))}</dd></div>
            ))}
            <div className="flex items-baseline justify-between pt-2"><dt className="font-semibold">Total</dt><dd className="font-display text-2xl font-extrabold tabular-nums">{formatBRL(bill.totalCents)}</dd></div>
          </dl>
        </div>
      )}
      {bill && bill.lines.length > 0 && bill.serviceFeeBps > 0 && (bill.feeWaivedBy === 'customer' || (bill.feeWaivedBy === null && bill.guestCanRefuseFee)) && (
        <Button className="w-full" variant="soft" loading={busy} onClick={toggleFee}>
          <Percent size={16} /> {bill.feeWaivedBy === 'customer' ? 'Aceitar a taxa de serviço' : 'Recusar a taxa de serviço'}
        </Button>
      )}
      {feeError && <p role="alert" className="text-sm text-danger">{feeError}</p>}
      {bill?.feeWaivedBy === 'staff' && <p className="text-xs text-muted">O atendimento retirou a taxa de serviço.</p>}
      <p className="text-xs text-muted">O pagamento é feito no local, com o garçom.</p>
      {children}
    </div>
  );
}
