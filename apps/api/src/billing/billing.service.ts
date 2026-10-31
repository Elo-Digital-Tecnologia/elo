import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import {
  type BillingEntryView,
  type DocumentView,
  dateOnly,
  dueDateProblems,
  expectedAmount,
  type PaymentPreview,
  paymentPeriod,
  paymentProblems,
  type PlanView,
} from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { AuditService } from '../audit/audit.service';
import { Document, Payment, Plan, Restaurant } from '../database/entities';
import { documentView, DocumentsService } from '../documents/documents.service';
import { StaffService } from '../staff/staff.service';

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
  if (!d) throw new BadRequestException({ message: 'invalid_date', field });
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
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(Payment) private readonly entries: Repository<Payment>,
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    private readonly data: DataSource,
    private readonly staff: StaffService,
    private readonly audit: AuditService,
    private readonly documents: DocumentsService,
  ) {}

  async listPlans(): Promise<PlanView[]> {
    const rows = await this.plans.find({ order: { active: 'DESC', priceCents: 'ASC' } });
    const usage = await this.restaurants
      .createQueryBuilder('r')
      .select('r.planId', 'planId')
      .addSelect('COUNT(*)::int', 'n')
      .where('r.planId IS NOT NULL')
      .groupBy('r.planId')
      .getRawMany<{ planId: string; n: number }>();
    const count = new Map(usage.map((u) => [u.planId, u.n]));
    return rows.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, cycleMonths: p.cycleMonths, active: p.active, restaurants: count.get(p.id) ?? 0 }));
  }

  createPlan(input: PlanInput): Promise<Plan> {
    return this.plans.save(this.plans.create({ name: input.name.trim(), priceCents: input.priceCents, cycleMonths: input.cycleMonths, active: input.active ?? true }));
  }

  /** Price changes apply to the next payments; past ones keep what was charged. */
  async updatePlan(id: string, input: Partial<PlanInput>): Promise<Plan> {
    const plan = await this.plans.findOne({ where: { id } });
    if (!plan) throw new NotFoundException();
    Object.assign(plan, Object.fromEntries(Object.entries({ ...input, name: input.name?.trim() }).filter(([, v]) => v !== undefined)));
    return this.plans.save(plan);
  }

  /** Only a plan no restaurant uses can go; one in use is deactivated instead. */
  async deletePlan(id: string): Promise<void> {
    if (await this.restaurants.count({ where: { planId: id }, withDeleted: true })) throw new ConflictException('plan_in_use');
    if ((await this.plans.delete({ id })).affected === 0) throw new NotFoundException();
  }

  async activePlan(id: string): Promise<Plan> {
    const plan = await this.plans.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('plan_not_found');
    if (!plan.active) throw new ConflictException('plan_inactive');
    return plan;
  }

  async changePlan(restaurantId: string, planId: string, actor: JwtUser): Promise<Restaurant> {
    const r = await this.restaurant(restaurantId);
    if (r.planId === planId) return r;
    const plan = await this.activePlan(planId);
    const from = r.plan?.name ?? null;
    r.planId = plan.id;
    r.plan = plan;
    const saved = await this.restaurants.save(r);
    await this.audit.record(actor, 'plan_changed', restaurantId, { target: plan.name, meta: { from } });
    return saved;
  }

  async history(restaurantId: string): Promise<BillingEntryView[]> {
    const rows = await this.entries.find({ where: { restaurantId }, order: { createdAt: 'DESC' } });
    const ids = rows.map((r) => r.receiptId).filter((id): id is string => !!id);
    const docs = ids.length ? await this.data.getRepository(Document).find({ where: { id: In(ids) } }) : [];
    const byId = new Map(docs.map((d) => [d.id, documentView(d)]));
    return rows.map((r) => view(r, r.receiptId ? byId.get(r.receiptId) ?? null : null));
  }

  /** A proof must be this restaurant's, sent as a receipt, and not already attached to another payment. */
  private async receipt(restaurantId: string, id: string | undefined): Promise<Document | null> {
    if (!id) return null;
    const doc = await this.documents.owned(restaurantId, id, 'receipt');
    if (await this.entries.exist({ where: { receiptId: id } })) throw new ConflictException({ statusCode: 409, message: 'receipt_in_use', field: 'receiptId' });
    return doc;
  }

  async preview(restaurantId: string, cycles: number, paidAt: string): Promise<PaymentPreview> {
    const r = await this.restaurant(restaurantId);
    const plan = this.planOf(r);
    const period = paymentPeriod({ dueDate: r.dueDate, paidAt: day(paidAt, 'paidAt'), cycles, cycleMonths: plan.cycleMonths });
    return {
      periodStart: period.start.toISOString(),
      newDueDate: period.end.toISOString(),
      expectedCents: expectedAmount(plan.priceCents, cycles),
      restartsFromPayment: period.restartsFromPayment,
    };
  }

  /** The period and the new due date come from the plan, never from the form. */
  async record(restaurantId: string, input: PaymentInput, actor: JwtUser): Promise<BillingEntryView> {
    const r = await this.restaurant(restaurantId);
    const plan = this.planOf(r);
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
      receipt: { documentId: input.receiptId, noReceiptReason },
    });
    if (problems.length) throw new BadRequestException({ message: 'invalid_payment', problems });
    const receipt = await this.receipt(restaurantId, input.receiptId);

    const period = paymentPeriod({ dueDate: r.dueDate, paidAt, cycles: input.cycles, cycleMonths: plan.cycleMonths });
    const entry = await this.data.transaction(async (em) => {
      const saved = await em.save(
        em.create(Payment, {
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
          ...(await this.recorder(actor)),
        }),
      );
      await this.syncDueDate(em, r);
      return saved;
    });
    await this.audit.record(actor, 'payment_recorded', restaurantId, {
      target: plan.name,
      meta: { amountCents, newDueDate: period.end.toISOString() },
    });
    return view(entry, receipt ? documentView(receipt) : null);
  }

  /** Fixes what was typed (amount, payment day, note); the period stays as calculated. */
  async edit(
    restaurantId: string,
    entryId: string,
    input: { amountCents?: number; paidAt?: string; note?: string | null; receiptId?: string; noReceiptReason?: string | null },
    actor: JwtUser,
  ): Promise<BillingEntryView> {
    const r = await this.restaurant(restaurantId);
    const entry = await this.activeEntry(restaurantId, entryId);
    if (entry.kind !== 'payment') throw new ConflictException('not_a_payment');
    const paidAt = input.paidAt !== undefined ? day(input.paidAt, 'paidAt') : entry.paidAt;
    const amountCents = input.amountCents ?? entry.amountCents;
    const note = input.note === undefined ? entry.note : input.note?.trim() || null;
    const expectedCents = entry.expectedCents ?? amountCents;
    const problems = paymentProblems({ paidAt, restaurantCreatedAt: r.createdAt, cycles: entry.cycles ?? 1, amountCents, expectedCents, note });
    if (problems.length) throw new BadRequestException({ message: 'invalid_payment', problems });

    // A proof can be attached later (it replaces the reason); one already attached stays.
    if (input.receiptId && entry.receiptId) throw new ConflictException({ statusCode: 409, message: 'receipt_already_attached', field: 'receiptId' });
    const receipt = await this.receipt(restaurantId, input.receiptId);
    const receiptId = receipt?.id ?? entry.receiptId;
    const noReceiptReason = receiptId ? null : input.noReceiptReason === undefined ? entry.noReceiptReason : input.noReceiptReason?.trim() || null;

    const fields = [
      amountCents !== entry.amountCents && 'amountCents',
      paidAt.getTime() !== entry.paidAt.getTime() && 'paidAt',
      note !== entry.note && 'note',
      receiptId !== entry.receiptId && 'receipt',
      noReceiptReason !== entry.noReceiptReason && 'noReceiptReason',
    ].filter((f): f is string => !!f);
    Object.assign(entry, { amountCents, paidAt, note, receiptId, noReceiptReason });
    const saved = await this.entries.save(entry);
    if (fields.length) await this.audit.record(actor, 'payment_edited', restaurantId, { meta: { fields, amountCents } });
    const doc = saved.receiptId ? await this.data.getRepository(Document).findOne({ where: { id: saved.receiptId } }) : null;
    return view(saved, doc ? documentView(doc) : null);
  }

  /** Only the latest entry can be voided, so the history never has a hole in the middle. */
  async void(restaurantId: string, entryId: string, reason: string, actor: JwtUser): Promise<BillingEntryView> {
    const r = await this.restaurant(restaurantId);
    const entry = await this.activeEntry(restaurantId, entryId);
    const latest = await this.latest(this.entries.manager, restaurantId);
    if (latest?.id !== entry.id) throw new ConflictException('not_latest_entry');
    const recorder = await this.recorder(actor);
    const saved = await this.data.transaction(async (em) => {
      Object.assign(entry, { voidedAt: new Date(), voidedBy: recorder.recordedBy, voidedByName: recorder.recordedByName, voidReason: reason.trim() });
      const out = await em.save(entry);
      await this.syncDueDate(em, r);
      return out;
    });
    await this.audit.record(actor, 'payment_voided', restaurantId, {
      meta: { reason: reason.trim(), amountCents: entry.amountCents, newDueDate: r.dueDate.toISOString() },
    });
    return view(saved, null);
  }

  /** Sets the due date by hand, with a reason: fixes a wrong entry or grants extra days. */
  async adjustDueDate(restaurantId: string, dueDate: string, reason: string, actor: JwtUser): Promise<BillingEntryView> {
    const r = await this.restaurant(restaurantId);
    const due = day(dueDate, 'dueDate');
    const problems = dueDateProblems({ dueDate: due, reason });
    if (problems.length) throw new BadRequestException({ message: 'invalid_due_date', problems });
    const from = r.dueDate;
    const entry = await this.data.transaction(async (em) => {
      const saved = await em.save(
        em.create(Payment, { restaurantId, kind: 'adjustment', amountCents: 0, paidAt: new Date(), newDueDate: due, note: reason.trim(), ...(await this.recorder(actor)) }),
      );
      await this.syncDueDate(em, r);
      return saved;
    });
    await this.audit.record(actor, 'due_date_adjusted', restaurantId, {
      meta: { reason: reason.trim(), from: from.toISOString(), newDueDate: due.toISOString() },
    });
    return view(entry, null);
  }

  /**
   * Ends the free trial today: billing starts now, with the usual grace days. Payments
   * already recorded keep their periods; to cut access at once, suspend instead.
   */
  async endTrial(restaurantId: string, reason: string, actor: JwtUser): Promise<void> {
    const r = await this.restaurant(restaurantId);
    const now = new Date();
    if (r.initialDueDate.getTime() <= now.getTime()) throw new ConflictException('trial_over');
    const today = dateOnly(now.toISOString().slice(0, 10))!;
    const from = r.initialDueDate;
    await this.data.transaction(async (em) => {
      r.initialDueDate = today;
      await em.update(Restaurant, { id: r.id }, { initialDueDate: today });
      await this.syncDueDate(em, r);
    });
    await this.audit.record(actor, 'trial_ended', restaurantId, { meta: { reason: reason.trim(), from: from.toISOString() } });
  }

  private async restaurant(id: string): Promise<Restaurant> {
    const r = await this.restaurants.findOne({ where: { id } });
    if (!r) throw new NotFoundException();
    return r;
  }

  private planOf(r: Restaurant): Plan {
    if (!r.plan) throw new ConflictException('no_plan');
    return r.plan;
  }

  private async activeEntry(restaurantId: string, id: string): Promise<Payment> {
    const entry = await this.entries.findOne({ where: { id, restaurantId } });
    if (!entry) throw new NotFoundException();
    if (entry.voidedAt) throw new ConflictException('already_voided');
    return entry;
  }

  private latest(em: EntityManager, restaurantId: string): Promise<Payment | null> {
    return em.findOne(Payment, { where: { restaurantId, voidedAt: IsNull() }, order: { createdAt: 'DESC' } });
  }

  private async syncDueDate(em: EntityManager, r: Restaurant): Promise<void> {
    const latest = await this.latest(em, r.id);
    r.dueDate = latest?.newDueDate ?? r.initialDueDate;
    await em.update(Restaurant, { id: r.id }, { dueDate: r.dueDate });
  }

  private async recorder(actor: JwtUser) {
    return { recordedBy: actor.sub, recordedByName: actor.name ?? (await this.staff.actorName(actor.sub)) };
  }
}

function view(p: Payment, receipt: DocumentView | null): BillingEntryView {
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
    createdAt: p.createdAt.toISOString(),
  };
}
