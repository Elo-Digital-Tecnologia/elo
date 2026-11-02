import { IsNull, type EntityManager } from 'typeorm';
import { billedDueDate, type BillingPlan, dateOnly, toDay } from '@elo/core';
import { Contract, Payment, Restaurant } from '../database/entities';

/**
 * Brings the restaurant's due date in line with its contracts and billing history:
 * the first billed day while nothing was paid, else the latest entry's due date,
 * both pushed past the days without a contract.
 */
export async function syncDueDate(em: EntityManager, restaurantId: string): Promise<Date> {
  const terms = await em.find(Contract, { where: { restaurantId } });
  const { initialDueDate } = await em.findOneOrFail(Restaurant, { where: { id: restaurantId }, loadEagerRelations: false });
  const latest = await em.findOne(Payment, { where: { restaurantId, voidedAt: IsNull() }, order: { createdAt: 'DESC' } });
  const due = latest ? toDay(latest.newDueDate) : toDay(initialDueDate);
  const base = latest ? toDay(latest.kind === 'payment' && latest.periodStart ? latest.periodStart : latest.newDueDate) : due;
  const dueDate = dateOnly(billedDueDate({ due, base }, terms))!;
  await em.update(Restaurant, { id: restaurantId }, { dueDate });
  return dueDate;
}

/** The plan change agreed during a contract (an amendment), as the plan rules read it. */
export const amendmentOf = (r: Restaurant): (BillingPlan & { at: Date }) | null =>
  r.planAmendedAt && r.priceCents != null && r.cycleMonths != null
    ? { id: r.planId, name: r.plan?.name ?? '', priceCents: r.priceCents, cycleMonths: r.cycleMonths, at: r.planAmendedAt }
    : null;
