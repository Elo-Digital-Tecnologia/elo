import type { ContractView } from '@elo/core/contracts/contracts';
import type { EntityManager } from 'typeorm';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { EnvConfig } from '#/config/env.js';
import type { ContractDTO } from './dto/contract.dto.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { dateOnly, toDay } from '@elo/core/billing/billing';
import {
    businessDay,
    contractProblems,
    effectiveEnds,
    latestContract,
    rebasedPayments,
    trialStatus
} from '@elo/core/contracts/contracts';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AuditLogService } from '#/modules/audit-logs/audit-log.service.js';
import { PaymentEntity } from '#/modules/billing/entities/payment.entity.js';
import { PlanEntity } from '#/modules/billing/entities/plan.entity.js';
import { PlanInactiveException } from '#/modules/billing/exceptions/plan-inactive.exception.js';
import { PlanNotFoundException } from '#/modules/billing/exceptions/plan-not-found.exception.js';
import { syncDueDate } from '#/modules/billing/utils/due-date.js';
import { DocumentService, documentView } from '#/modules/documents/document.service.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { RestaurantNotFoundException } from '#/modules/restaurants/exceptions/restaurant-not-found.exception.js';
import { ContractEntity } from './entities/contract.entity.js';
import { ContractAlreadyVoidedException } from './exceptions/contract-already-voided.exception.js';
import { ContractNotFoundException } from './exceptions/contract-not-found.exception.js';
import { DocumentInUseException } from './exceptions/document-in-use.exception.js';
import { InvalidContractException } from './exceptions/invalid-contract.exception.js';
import { NotLatestContractException } from './exceptions/not-latest-contract.exception.js';
import { TrialOverException } from './exceptions/trial-over.exception.js';

const ACTION = {
    initial: 'contract_registered',
    conversion: 'contract_converted',
    renewal: 'contract_renewed'
} as const;

/**
 * Signed contracts of a restaurant. Each operation (first contract, conversion of a
 * pilot, renewal) adds a row with its own file; a contract registered by mistake is
 * voided, never deleted. The contracts alone decide whether the team and the menu
 * are on; the restaurant only follows their billing start (the pilot's free trial).
 */
@Injectable()
export class ContractService {
    constructor(
        @InjectRepository(ContractEntity)
        private readonly contracts: Repository<ContractEntity>,
        @InjectRepository(RestaurantEntity)
        private readonly restaurants: Repository<RestaurantEntity>,
        private readonly documents: DocumentService,
        private readonly audit: AuditLogService,
        private readonly data: DataSource,
        private readonly configService: ConfigService<EnvConfig, true>
    ) {}

    private today(): string {
        return businessDay(
            new Date(),
            this.configService.getOrThrow('app.timeZone', { infer: true })
        );
    }

    public async list(restaurantId: string): Promise<ContractView[]> {
        const rows = await this.contracts.find({
            where: { restaurantId },
            relations: { document: true },
            order: { createdAt: 'DESC' }
        });
        return rows.map((c) => ({
            id: c.id,
            kind: c.kind,
            origin: c.origin,
            previousId: c.previousId,
            signedOn: c.signedOn,
            startsOn: c.startsOn,
            endsOn: c.endsOn,
            effectiveEndsOn: c.effectiveEndsOn,
            plan:
                c.priceCents != null && c.cycleMonths != null
                    ? {
                          id: c.planId,
                          name: c.planName ?? '',
                          priceCents: c.priceCents,
                          cycleMonths: c.cycleMonths
                      }
                    : null,
            trialDays: c.trialDays,
            trialEndedOn: c.trialEndedOn,
            trialEndReason: c.trialEndReason,
            signatory: {
                name: c.signatoryName,
                role: c.signatoryRole,
                contact: c.signatoryContact
            },
            document: documentView(c.document!),
            createdByName: c.createdByName,
            createdAt: c.createdAt.toISOString(),
            voided: c.voidedAt
                ? {
                      at: c.voidedAt.toISOString(),
                      byName: c.voidedByName ?? '',
                      reason: c.voidReason ?? ''
                  }
                : null
        }));
    }

    public async register(
        restaurantId: string,
        dto: ContractDTO,
        actor: JwtUser
    ): Promise<ContractView> {
        const doc = await this.documents.owned(restaurantId, dto.documentId, 'contract');
        const who = await this.audit.who(actor);
        const today = this.today();
        const trialDays = dto.trialDays ?? 0;

        const saved = await this.data.transaction(async (em) => {
            // One operation at a time per restaurant: two "first contracts" sent together cannot both pass.
            const restaurant = await this.lock(em, restaurantId);
            const existing = await em.find(ContractEntity, {
                where: { restaurantId },
                order: { createdAt: 'DESC' }
            });
            const plan = await this.planFor(
                em,
                dto.planId ?? restaurant.planId,
                restaurant.planId
            );
            const problems = [
                ...contractProblems({ ...dto, trialDays }, existing, today),
                ...(plan ? [] : (['plan_required'] as const))
            ];
            if (problems.length) throw new InvalidContractException(problems);
            if (await em.exists(ContractEntity, { where: { documentId: doc.id } }))
                throw new DocumentInUseException('documentId');
            const previous = latestContract(existing);

            let cutsTrial = false;
            if (dto.origin === 'conversion' && previous) {
                // Converting during the free trial ends it: billing starts with the definitive contract.
                const trial = trialStatus(existing, today);
                if (
                    previous.origin === 'initial' &&
                    trial.billingStartsOn &&
                    dto.startsOn < trial.billingStartsOn &&
                    !previous.trialEndedOn
                ) {
                    await em.update(
                        ContractEntity,
                        { id: previous.id },
                        { trialEndedOn: dto.startsOn, trialEndReason: 'conversion' }
                    );
                    cutsTrial = true;
                }
            }
            const row = await em.save(
                em.create(ContractEntity, {
                    restaurantId,
                    kind: dto.kind,
                    origin: dto.origin,
                    previousId: previous?.id ?? null,
                    signedOn: dto.signedOn,
                    startsOn: dto.startsOn,
                    endsOn: dto.endsOn,
                    effectiveEndsOn: dto.endsOn,
                    trialDays,
                    planId: plan!.id,
                    planName: plan!.name,
                    priceCents: plan!.priceCents,
                    cycleMonths: plan!.cycleMonths,
                    signatoryName: dto.signatory.name,
                    signatoryRole: dto.signatory.role,
                    signatoryContact: dto.signatory.contact,
                    documentId: doc.id,
                    createdBy: who.id,
                    createdByName: who.name
                })
            );
            // The plan signed last is the restaurant's reference plan (the price in force comes from the contracts).
            await em.update(RestaurantEntity, { id: restaurantId }, { planId: plan!.id });
            await this.refresh(em, restaurantId, cutsTrial);
            return row;
        });
        await this.audit.record(actor, ACTION[dto.origin], restaurantId, {
            meta: {
                kind: dto.kind,
                startsOn: dto.startsOn,
                endsOn: dto.endsOn,
                plan: saved.planName,
                priceCents: saved.priceCents,
                ...(trialDays ? { trialDays } : {})
            }
        });
        return (await this.list(restaurantId)).find((c) => c.id === saved.id)!;
    }

    /**
     * Voids the latest contract (registered by mistake). It stays in the history; a
     * voided conversion gives the pilot back its days and, if it cut the trial, the trial.
     */
    public async void(
        restaurantId: string,
        contractId: string,
        reason: string,
        actor: JwtUser
    ): Promise<ContractView> {
        const who = await this.audit.who(actor);
        const voided = await this.data.transaction(async (em) => {
            await this.lock(em, restaurantId);
            const existing = await em.find(ContractEntity, { where: { restaurantId } });
            const target = existing.find((c) => c.id === contractId);
            if (!target) throw new ContractNotFoundException();
            if (target.voidedAt) throw new ContractAlreadyVoidedException();
            if (latestContract(existing)?.id !== target.id)
                throw new NotLatestContractException();
            await em.update(
                ContractEntity,
                { id: target.id },
                {
                    voidedAt: new Date(),
                    voidedBy: who.id,
                    voidedByName: who.name,
                    voidReason: reason.trim()
                }
            );
            const previous = existing.find((c) => c.id === target.previousId);
            const restoresTrial =
                target.origin === 'conversion' &&
                previous?.trialEndReason === 'conversion';
            if (restoresTrial)
                await em.update(
                    ContractEntity,
                    { id: previous!.id },
                    { trialEndedOn: null, trialEndReason: null }
                );
            await this.refresh(em, restaurantId, restoresTrial);
            return target;
        });
        await this.audit.record(actor, 'contract_voided', restaurantId, {
            meta: {
                reason: reason.trim(),
                kind: voided.kind,
                startsOn: voided.startsOn,
                endsOn: voided.endsOn
            }
        });
        return (await this.list(restaurantId)).find((c) => c.id === contractId)!;
    }

    /**
     * Ends the pilot's free trial today: billing starts now, with the usual grace days.
     * Payments already recorded move up with it, so the trial days left are not kept for free.
     */
    public async endTrial(
        restaurantId: string,
        reason: string,
        actor: JwtUser
    ): Promise<void> {
        const today = this.today();
        const ended = await this.data.transaction(async (em) => {
            await this.lock(em, restaurantId);
            const existing = await em.find(ContractEntity, { where: { restaurantId } });
            const trial = trialStatus(existing, today);
            if (trial.state !== 'running') throw new TrialOverException();
            const first = existing.find((c) => !c.voidedAt && c.origin === 'initial')!;
            await em.update(
                ContractEntity,
                { id: first.id },
                { trialEndedOn: today, trialEndReason: 'early' }
            );
            const moved = await this.refresh(em, restaurantId, true);
            return { trial, moved };
        });
        await this.audit.record(actor, 'trial_ended', restaurantId, {
            meta: {
                reason: reason.trim(),
                from: ended.trial.billingStartsOn,
                ...(ended.moved ? { paymentsMoved: ended.moved } : {})
            }
        });
    }

    /** The plan a new contract signs: an active one, or the restaurant's own even if it was retired since. */
    private async planFor(
        em: EntityManager,
        planId: string | null | undefined,
        own: string | null
    ): Promise<PlanEntity | null> {
        if (!planId) return null;
        const plan = await em.findOne(PlanEntity, { where: { id: planId } });
        if (!plan) throw new PlanNotFoundException();
        if (!plan.active && plan.id !== own) throw new PlanInactiveException();
        return plan;
    }

    private async lock(
        em: EntityManager,
        restaurantId: string
    ): Promise<RestaurantEntity> {
        const r = await em.findOne(RestaurantEntity, {
            where: { id: restaurantId },
            loadEagerRelations: false,
            lock: { mode: 'pessimistic_write' }
        });
        if (!r) throw new RestaurantNotFoundException();
        return r;
    }

    /**
     * Brings derived data in line with the contracts: each one's last covered day (for the SQL filters) and the due date.
     * With `rebase`, the first billed day moved because of the trial, and the payments that followed it move with it
     * (the number moved is returned).
     */
    private async refresh(
        em: EntityManager,
        restaurantId: string,
        rebase = false
    ): Promise<number> {
        const rows = await em.find(ContractEntity, { where: { restaurantId } });
        const ends = effectiveEnds(rows);
        for (const c of rows) {
            const end = ends.get(c.id) ?? c.endsOn;
            if (c.effectiveEndsOn !== end)
                await em.update(ContractEntity, { id: c.id }, { effectiveEndsOn: end });
        }
        // The first billed day follows the pilot's trial.
        const billing = trialStatus(rows, this.today()).billingStartsOn;
        if (!billing) return 0;
        const { initialDueDate } = await em.findOneOrFail(RestaurantEntity, {
            where: { id: restaurantId },
            loadEagerRelations: false
        });
        let moved = 0;
        if (rebase) {
            const entries = await em.find(PaymentEntity, {
                where: { restaurantId, voidedAt: IsNull() },
                order: { createdAt: 'ASC' }
            });
            const periods = rebasedPayments(
                entries.map((e) => ({
                    id: e.id,
                    kind: e.kind,
                    periodStart: e.periodStart && toDay(e.periodStart),
                    newDueDate: toDay(e.newDueDate)
                })),
                toDay(initialDueDate),
                billing,
                rows
            );
            for (const [id, p] of periods)
                await em.update(
                    PaymentEntity,
                    { id },
                    {
                        periodStart: dateOnly(p.periodStart)!,
                        newDueDate: dateOnly(p.newDueDate)!
                    }
                );
            moved = periods.size;
        }
        await em.update(
            RestaurantEntity,
            { id: restaurantId },
            { initialDueDate: dateOnly(billing)! }
        );
        await syncDueDate(em, restaurantId);
        return moved;
    }
}
