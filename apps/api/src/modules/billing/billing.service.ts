import type {
    BillingEntryView,
    DocumentView,
    PaymentPreview,
    PlanView
} from '@elo/core/billing/billing';
import type { BillingPlan } from '@elo/core/contracts/contracts';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { EnvConfig } from '#/config/env.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
    dateOnly,
    dueDateProblems,
    expectedAmount,
    paymentPeriod,
    paymentProblems,
    toDay
} from '@elo/core/billing/billing';
import {
    billingProblem,
    businessDay,
    contractSummary,
    planInForce
} from '@elo/core/contracts/contracts';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { AuditLogService } from '#/modules/audit-logs/audit-log.service.js';
import { ContractEntity } from '#/modules/contracts/entities/contract.entity.js';
import { DocumentService, documentView } from '#/modules/documents/document.service.js';
import { DocumentEntity } from '#/modules/documents/entities/document.entity.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { RestaurantNotFoundException } from '#/modules/restaurants/exceptions/restaurant-not-found.exception.js';
import { StaffService } from '#/modules/staff/staff.service.js';
import { PaymentEntity } from './entities/payment.entity.js';
import { PlanEntity } from './entities/plan.entity.js';
import { AlreadyVoidedException } from './exceptions/already-voided.exception.js';
import { ContractPendingException } from './exceptions/contract-pending.exception.js';
import { InvalidDateException } from './exceptions/invalid-date.exception.js';
import { InvalidDueDateException } from './exceptions/invalid-due-date.exception.js';
import { InvalidPaymentException } from './exceptions/invalid-payment.exception.js';
import { NoPlanException } from './exceptions/no-plan.exception.js';
import { NotAPaymentException } from './exceptions/not-apayment.exception.js';
import { NotLatestEntryException } from './exceptions/not-latest-entry.exception.js';
import { NothingOwedException } from './exceptions/nothing-owed.exception.js';
import { PaymentNotFoundException } from './exceptions/payment-not-found.exception.js';
import { PlanInUseException } from './exceptions/plan-in-use.exception.js';
import { PlanInactiveException } from './exceptions/plan-inactive.exception.js';
import { PlanNotFoundException } from './exceptions/plan-not-found.exception.js';
import { ReceiptAlreadyAttachedException } from './exceptions/receipt-already-attached.exception.js';
import { ReceiptInUseException } from './exceptions/receipt-in-use.exception.js';
import { amendmentOf, syncDueDate } from './utils/due-date.js';

export interface PlanInput {
    name: string;
    priceCents: number;
    cycleMonths: number;
    active?: boolean;
}

export interface PaymentInput {
    cycles: number;
    paidAt: string;
    amountCents?: number;
    note?: string | null;
    receiptId?: string;
    noReceiptReason?: string | null;
}

const day = (value: string, field: string) => {
    const d = dateOnly(value);
    if (!d) throw new InvalidDateException(field);
    return d;
};

/**
 * Subscription billing: the plan catalog and each restaurant's history of payments
 * and due date adjustments. The restaurant's due date always follows the latest
 * entry that was not voided, falling back to the end of its trial.
 */
@Injectable()
export class BillingService {
    constructor(
        @InjectRepository(PlanEntity) private readonly plans: Repository<PlanEntity>,
        @InjectRepository(PaymentEntity)
        private readonly entries: Repository<PaymentEntity>,
        @InjectRepository(RestaurantEntity)
        private readonly restaurants: Repository<RestaurantEntity>,
        private readonly data: DataSource,
        private readonly staff: StaffService,
        private readonly audit: AuditLogService,
        private readonly documents: DocumentService,
        private readonly configService: ConfigService<EnvConfig, true>
    ) {}

    public async listPlans(): Promise<PlanView[]> {
        const rows = await this.plans.find({
            order: { active: 'DESC', priceCents: 'ASC' }
        });
        const usage = await this.restaurants
            .createQueryBuilder('r')
            .select('r.planId', 'planId')
            .addSelect('COUNT(*)::int', 'n')
            .where('r.planId IS NOT NULL')
            .groupBy('r.planId')
            .getRawMany<{ planId: string; n: number }>();
        const count = new Map(usage.map((u) => [u.planId, u.n]));
        return rows.map((p) => ({
            id: p.id,
            name: p.name,
            priceCents: p.priceCents,
            cycleMonths: p.cycleMonths,
            active: p.active,
            restaurants: count.get(p.id) ?? 0
        }));
    }

    public createPlan(input: PlanInput): Promise<PlanEntity> {
        return this.plans.save(
            this.plans.create({
                name: input.name.trim(),
                priceCents: input.priceCents,
                cycleMonths: input.cycleMonths,
                active: input.active ?? true
            })
        );
    }

    /** Price changes apply to the next payments; past ones keep what was charged. */
    public async updatePlan(id: string, input: Partial<PlanInput>): Promise<PlanEntity> {
        const plan = await this.plans.findOne({ where: { id } });
        if (!plan) throw new PlanNotFoundException();
        Object.assign(
            plan,
            Object.fromEntries(
                Object.entries({ ...input, name: input.name?.trim() }).filter(
                    ([, v]) => v !== undefined
                )
            )
        );
        return this.plans.save(plan);
    }

    /** Only a plan no restaurant uses can go; one in use is deactivated instead. */
    public async deletePlan(id: string): Promise<void> {
        if (await this.restaurants.count({ where: { planId: id }, withDeleted: true }))
            throw new PlanInUseException();
        if ((await this.plans.delete({ id })).affected === 0)
            throw new PlanNotFoundException();
    }

    public async activePlan(id: string): Promise<PlanEntity> {
        const plan = await this.plans.findOne({ where: { id } });
        if (!plan) throw new PlanNotFoundException();
        if (!plan.active) throw new PlanInactiveException();
        return plan;
    }

    /**
     * Changes the plan during a contract (an amendment, with a reason). The price agreed
     * now is kept and applies from the next payment; before a contract, the plan comes with it.
     */
    public async changePlan(
        restaurantId: string,
        planId: string,
        reason: string,
        actor: JwtUser
    ): Promise<RestaurantEntity> {
        const r = await this.restaurant(restaurantId);
        await this.assertBilling(r, false);
        const before = await this.planOf(r);
        const plan = await this.activePlan(planId);
        if (
            before &&
            before.id === plan.id &&
            before.priceCents === plan.priceCents &&
            before.cycleMonths === plan.cycleMonths
        )
            return r;
        Object.assign(r, {
            planId: plan.id,
            plan,
            priceCents: plan.priceCents,
            cycleMonths: plan.cycleMonths,
            planAmendedAt: new Date()
        });
        const saved = await this.restaurants.save(r);
        await this.audit.record(actor, 'plan_changed', restaurantId, {
            target: plan.name,
            meta: {
                from: before?.name ?? null,
                fromCents: before?.priceCents ?? null,
                toCents: plan.priceCents,
                reason: reason.trim()
            }
        });
        return saved;
    }

    public async history(restaurantId: string): Promise<BillingEntryView[]> {
        const rows = await this.entries.find({
            where: { restaurantId },
            order: { createdAt: 'DESC' }
        });
        const ids = rows.map((r) => r.receiptId).filter((id): id is string => !!id);
        const docs = ids.length
            ? await this.data
                  .getRepository(DocumentEntity)
                  .find({ where: { id: In(ids) } })
            : [];
        const byId = new Map(docs.map((d) => [d.id, documentView(d)]));
        return rows.map((r) =>
            view(r, r.receiptId ? (byId.get(r.receiptId) ?? null) : null)
        );
    }

    /** A proof must be this restaurant's, sent as a receipt, and not already attached to another payment. */
    private async receipt(
        restaurantId: string,
        id: string | undefined
    ): Promise<DocumentEntity | null> {
        if (!id) return null;
        const doc = await this.documents.owned(restaurantId, id, 'receipt');
        if (await this.entries.exist({ where: { receiptId: id } }))
            throw new ReceiptInUseException('receiptId');
        return doc;
    }

    public async preview(
        restaurantId: string,
        cycles: number,
        paidAt: string
    ): Promise<PaymentPreview> {
        const r = await this.restaurant(restaurantId);
        const plan = await this.planOf(r);
        const period = paymentPeriod({
            dueDate: r.dueDate,
            paidAt: day(paidAt, 'paidAt'),
            cycles,
            cycleMonths: plan.cycleMonths,
            contractEnded: await this.contractEnded(r)
        });
        return {
            periodStart: period.start.toISOString(),
            newDueDate: period.end.toISOString(),
            expectedCents: expectedAmount(plan.priceCents, cycles),
            restartsFromPayment: period.restartsFromPayment
        };
    }

    /** The period and the new due date come from the plan, never from the form. */
    public async record(
        restaurantId: string,
        input: PaymentInput,
        actor: JwtUser
    ): Promise<BillingEntryView> {
        const r = await this.restaurant(restaurantId);
        await this.assertBilling(r, true);
        const plan = await this.planOf(r);
        const paidAt = day(input.paidAt, 'paidAt');
        const expectedCents = expectedAmount(plan.priceCents, input.cycles);
        const amountCents = input.amountCents ?? expectedCents;
        const note = input.note?.trim() || null;
        const noReceiptReason = input.noReceiptReason?.trim() || null;
        const problems = paymentProblems({
            paidAt,
            restaurantCreatedAt: r.createdAt,
            cycles: input.cycles,
            amountCents,
            expectedCents,
            note,
            receipt: { documentId: input.receiptId, noReceiptReason }
        });
        if (problems.length) throw new InvalidPaymentException(problems);
        const receipt = await this.receipt(restaurantId, input.receiptId);

        const period = paymentPeriod({
            dueDate: r.dueDate,
            paidAt,
            cycles: input.cycles,
            cycleMonths: plan.cycleMonths,
            contractEnded: await this.contractEnded(r)
        });
        const entry = await this.data.transaction(async (em) => {
            const saved = await em.save(
                em.create(PaymentEntity, {
                    restaurantId,
                    kind: 'payment',
                    amountCents,
                    expectedCents,
                    paidAt,
                    periodStart: period.start,
                    newDueDate: period.end,
                    planId: plan.id,
                    planName: plan.name,
                    cycles: input.cycles,
                    note,
                    receiptId: receipt?.id ?? null,
                    noReceiptReason: receipt ? null : noReceiptReason,
                    ...(await this.recorder(actor))
                })
            );
            await this.syncDueDate(em, r);
            return saved;
        });
        await this.audit.record(actor, 'payment_recorded', restaurantId, {
            target: plan.name,
            meta: { amountCents, newDueDate: period.end.toISOString() }
        });
        return view(entry, receipt ? documentView(receipt) : null);
    }

    /** Fixes what was typed (amount, payment day, note); the period stays as calculated. */
    public async edit(
        restaurantId: string,
        entryId: string,
        input: {
            amountCents?: number;
            paidAt?: string;
            note?: string | null;
            receiptId?: string;
            noReceiptReason?: string | null;
        },
        actor: JwtUser
    ): Promise<BillingEntryView> {
        const r = await this.restaurant(restaurantId);
        const entry = await this.activeEntry(restaurantId, entryId);
        if (entry.kind !== 'payment') throw new NotAPaymentException();
        const paidAt =
            input.paidAt !== undefined ? day(input.paidAt, 'paidAt') : entry.paidAt;
        const amountCents = input.amountCents ?? entry.amountCents;
        const note = input.note === undefined ? entry.note : input.note?.trim() || null;
        const expectedCents = entry.expectedCents ?? amountCents;
        const problems = paymentProblems({
            paidAt,
            restaurantCreatedAt: r.createdAt,
            cycles: entry.cycles ?? 1,
            amountCents,
            expectedCents,
            note
        });
        if (problems.length) throw new InvalidPaymentException(problems);

        // A proof can be attached later (it replaces the reason); one already attached stays.
        if (input.receiptId && entry.receiptId)
            throw new ReceiptAlreadyAttachedException('receiptId');
        const receipt = await this.receipt(restaurantId, input.receiptId);
        const receiptId = receipt?.id ?? entry.receiptId;
        const noReceiptReason = receiptId
            ? null
            : input.noReceiptReason === undefined
              ? entry.noReceiptReason
              : input.noReceiptReason?.trim() || null;

        const fields = [
            amountCents !== entry.amountCents && 'amountCents',
            paidAt.getTime() !== entry.paidAt.getTime() && 'paidAt',
            note !== entry.note && 'note',
            receiptId !== entry.receiptId && 'receipt',
            noReceiptReason !== entry.noReceiptReason && 'noReceiptReason'
        ].filter((f): f is string => !!f);
        Object.assign(entry, { amountCents, paidAt, note, receiptId, noReceiptReason });
        const saved = await this.entries.save(entry);
        if (fields.length)
            await this.audit.record(actor, 'payment_edited', restaurantId, {
                meta: { fields, amountCents }
            });
        const doc = saved.receiptId
            ? await this.data
                  .getRepository(DocumentEntity)
                  .findOne({ where: { id: saved.receiptId } })
            : null;
        return view(saved, doc ? documentView(doc) : null);
    }

    /** Only the latest entry can be voided, so the history never has a hole in the middle. */
    public async void(
        restaurantId: string,
        entryId: string,
        reason: string,
        actor: JwtUser
    ): Promise<BillingEntryView> {
        const r = await this.restaurant(restaurantId);
        const entry = await this.activeEntry(restaurantId, entryId);
        const latest = await this.latest(this.entries.manager, restaurantId);
        if (latest?.id !== entry.id) throw new NotLatestEntryException();
        const recorder = await this.recorder(actor);
        const saved = await this.data.transaction(async (em) => {
            Object.assign(entry, {
                voidedAt: new Date(),
                voidedBy: recorder.recordedBy,
                voidedByName: recorder.recordedByName,
                voidReason: reason.trim()
            });
            const out = await em.save(entry);
            await this.syncDueDate(em, r);
            return out;
        });
        await this.audit.record(actor, 'payment_voided', restaurantId, {
            meta: {
                reason: reason.trim(),
                amountCents: entry.amountCents,
                newDueDate: r.dueDate.toISOString()
            }
        });
        return view(saved, null);
    }

    /** Sets the due date by hand, with a reason: fixes a wrong entry or grants extra days. */
    public async adjustDueDate(
        restaurantId: string,
        dueDate: string,
        reason: string,
        actor: JwtUser
    ): Promise<BillingEntryView> {
        const r = await this.restaurant(restaurantId);
        await this.assertBilling(r, false);
        const due = day(dueDate, 'dueDate');
        const problems = dueDateProblems({ dueDate: due, reason });
        if (problems.length) throw new InvalidDueDateException(problems);
        const from = r.dueDate;
        const entry = await this.data.transaction(async (em) => {
            const saved = await em.save(
                em.create(PaymentEntity, {
                    restaurantId,
                    kind: 'adjustment',
                    amountCents: 0,
                    paidAt: new Date(),
                    newDueDate: due,
                    note: reason.trim(),
                    ...(await this.recorder(actor))
                })
            );
            await this.syncDueDate(em, r);
            return saved;
        });
        await this.audit.record(actor, 'due_date_adjusted', restaurantId, {
            meta: {
                reason: reason.trim(),
                from: from.toISOString(),
                newDueDate: due.toISOString()
            }
        });
        return view(entry, null);
    }

    private async restaurant(id: string): Promise<RestaurantEntity> {
        const r = await this.restaurants.findOne({ where: { id } });
        if (!r) throw new RestaurantNotFoundException();
        return r;
    }

    private today(): string {
        return businessDay(
            new Date(),
            this.configService.getOrThrow('app.timeZone', { infer: true })
        );
    }

    /**
     * Billing starts with the first contract. A payment also needs a contract in force,
     * a debt of covered days or a renewal already scheduled; due date fixes only the first.
     */
    private async assertBilling(r: RestaurantEntity, payment: boolean): Promise<void> {
        const terms = await this.data
            .getRepository(ContractEntity)
            .find({ where: { restaurantId: r.id } });
        const summary = contractSummary(terms, this.today());
        const problem = billingProblem(summary, toDay(r.dueDate));
        if (problem === 'contract_pending') throw new ContractPendingException();
        if (payment && problem === 'nothing_owed') throw new NothingOwedException();
    }

    private async contractEnded(r: RestaurantEntity): Promise<boolean> {
        const terms = await this.data
            .getRepository(ContractEntity)
            .find({ where: { restaurantId: r.id } });
        return contractSummary(terms, this.today()).state === 'ended';
    }

    /** What the restaurant pays now: the contract in force, or a later amendment. */
    private async planOf(r: RestaurantEntity): Promise<BillingPlan> {
        const terms = await this.data
            .getRepository(ContractEntity)
            .find({ where: { restaurantId: r.id } });
        const plan = planInForce(terms, this.today(), amendmentOf(r));
        if (!plan) throw new NoPlanException();
        return plan;
    }

    private async activeEntry(restaurantId: string, id: string): Promise<PaymentEntity> {
        const entry = await this.entries.findOne({ where: { id, restaurantId } });
        if (!entry) throw new PaymentNotFoundException();
        if (entry.voidedAt) throw new AlreadyVoidedException();
        return entry;
    }

    private latest(
        em: EntityManager,
        restaurantId: string
    ): Promise<PaymentEntity | null> {
        return em.findOne(PaymentEntity, {
            where: { restaurantId, voidedAt: IsNull() },
            order: { createdAt: 'DESC' }
        });
    }

    private async syncDueDate(em: EntityManager, r: RestaurantEntity): Promise<void> {
        r.dueDate = await syncDueDate(em, r.id);
    }

    private async recorder(actor: JwtUser) {
        return {
            recordedBy: actor.sub,
            recordedByName: actor.name ?? (await this.staff.actorName(actor.sub))
        };
    }
}

function view(p: PaymentEntity, receipt: DocumentView | null): BillingEntryView {
    return {
        id: p.id,
        kind: p.kind,
        amountCents: p.amountCents,
        expectedCents: p.expectedCents,
        paidAt: p.paidAt.toISOString(),
        periodStart: p.periodStart?.toISOString() ?? null,
        newDueDate: p.newDueDate.toISOString(),
        cycles: p.cycles,
        planName: p.planName,
        note: p.note,
        recordedByName: p.recordedByName,
        voidedAt: p.voidedAt?.toISOString() ?? null,
        voidedByName: p.voidedByName,
        voidReason: p.voidReason,
        receipt,
        noReceiptReason: p.noReceiptReason,
        createdAt: p.createdAt.toISOString()
    };
}
