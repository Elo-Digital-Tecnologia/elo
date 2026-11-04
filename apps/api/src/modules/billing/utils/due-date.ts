import type { BillingPlan } from '@elo/core/contracts/contracts';
import type { EntityManager } from 'typeorm';
import { dateOnly, toDay } from '@elo/core/billing/billing';
import { billedDueDate } from '@elo/core/contracts/contracts';
import { IsNull } from 'typeorm';
import { ContractEntity } from '#/modules/contracts/entities/contract.entity.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { PaymentEntity } from '../entities/payment.entity.js';

/**
 * Brings the restaurant's due date in line with its contracts and billing history:
 * the first billed day while nothing was paid, else the latest entry's due date,
 * both pushed past the days without a contract.
 */
export async function syncDueDate(
    em: EntityManager,
    restaurantId: string
): Promise<Date> {
    const terms = await em.find(ContractEntity, { where: { restaurantId } });
    const { initialDueDate } = await em.findOneOrFail(RestaurantEntity, {
        where: { id: restaurantId },
        loadEagerRelations: false
    });
    const latest = await em.findOne(PaymentEntity, {
        where: { restaurantId, voidedAt: IsNull() },
        order: { createdAt: 'DESC' }
    });
    const due = latest ? toDay(latest.newDueDate) : toDay(initialDueDate);
    const base = latest
        ? toDay(
              latest.kind === 'payment' && latest.periodStart
                  ? latest.periodStart
                  : latest.newDueDate
          )
        : due;
    const dueDate = dateOnly(billedDueDate({ due, base }, terms))!;
    await em.update(RestaurantEntity, { id: restaurantId }, { dueDate });
    return dueDate;
}

/** The plan change agreed during a contract (an amendment), as the plan rules read it. */
export const amendmentOf = (r: RestaurantEntity): (BillingPlan & { at: Date }) | null =>
    r.planAmendedAt && r.priceCents != null && r.cycleMonths != null
        ? {
              id: r.planId,
              name: r.plan?.name ?? '',
              priceCents: r.priceCents,
              cycleMonths: r.cycleMonths,
              at: r.planAmendedAt
          }
        : null;
