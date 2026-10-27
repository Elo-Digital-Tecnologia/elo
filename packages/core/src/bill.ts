import { splitEqually } from './money';

export interface BillLine {
  name: string;
  unitCents: number;
  quantity: number;
}

export interface Bill {
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
}

/** `serviceFeeBps`: taxa em pontos-base (1000 = 10%). `waiveFee`: garçom/cliente removeu a taxa. */
export function calculateBill(lines: BillLine[], serviceFeeBps: number, waiveFee = false): Bill {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
  const serviceFeeCents = waiveFee ? 0 : Math.round((subtotalCents * serviceFeeBps) / 10_000);
  return { subtotalCents, serviceFeeCents, totalCents: subtotalCents + serviceFeeCents };
}

export function splitBillEqually(bill: Bill, people: number): number[] {
  return splitEqually(bill.totalCents, people);
}
