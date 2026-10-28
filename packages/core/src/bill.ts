import { splitEqually } from './money';

export interface BillLine {
  name: string;
  unitCents: number;
  quantity: number;
}

/** Ajuste manual da conta (garçom/caixa): positivo acrescenta, negativo dá desconto. */
export interface BillAdjustment {
  label: string;
  cents: number;
}

export interface Bill {
  subtotalCents: number;
  serviceFeeCents: number;
  adjustmentsCents: number;
  totalCents: number;
}

/**
 * `serviceFeeBps`: taxa em pontos-base (1000 = 10%), calculada sobre o subtotal
 * dos itens. `waiveFee`: taxa removida (pelo cliente ou pelo garçom).
 * Ajustes entram depois da taxa; o total nunca fica negativo.
 */
export function calculateBill(
  lines: BillLine[],
  serviceFeeBps: number,
  waiveFee = false,
  adjustments: BillAdjustment[] = [],
): Bill {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
  const serviceFeeCents = waiveFee ? 0 : Math.round((subtotalCents * serviceFeeBps) / 10_000);
  const adjustmentsCents = adjustments.reduce((sum, a) => sum + a.cents, 0);
  const totalCents = Math.max(0, subtotalCents + serviceFeeCents + adjustmentsCents);
  return { subtotalCents, serviceFeeCents, adjustmentsCents, totalCents };
}

/** Divisão por pessoa: igualmente entre N. */
export function splitBillEqually(bill: Bill, people: number): number[] {
  return splitEqually(bill.totalCents, people);
}

/**
 * Divisão por item: `consumedCents[i]` é o subtotal de itens da pessoa i. Taxa e
 * ajustes são rateados na proporção do consumo; o maior resto fecha os centavos
 * e a soma das partes é sempre o total.
 */
export function splitBillByItems(bill: Bill, consumedCents: number[]): number[] {
  if (consumedCents.length === 0) throw new RangeError('at least one person');
  if (consumedCents.some((c) => !Number.isInteger(c) || c < 0)) throw new RangeError('invalid consumption');
  const consumed = consumedCents.reduce((a, b) => a + b, 0);
  if (consumed !== bill.subtotalCents) throw new RangeError('consumption must add up to the subtotal');
  if (consumed === 0) return splitEqually(bill.totalCents, consumedCents.length);

  const exact = consumedCents.map((c) => (bill.totalCents * c) / consumed);
  const parts = exact.map(Math.floor);
  let rest = bill.totalCents - parts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    parts[i] += 1;
    rest -= 1;
  }
  return parts;
}
