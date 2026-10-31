import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, IsNull, Repository } from 'typeorm';
import { businessDay, contractProblems, type ContractView, dateOnly, effectiveEnds, latestContract, trialStatus } from '@elo/core';
import type { Env } from '../config/env';
import type { JwtUser } from '../common/auth-types';
import { AuditService } from '../audit/audit.service';
import { Contract, Payment, Restaurant } from '../database/entities';
import { documentView, DocumentsService } from '../documents/documents.service';
import type { ContractDto } from './contracts.dto';

const ACTION = { initial: 'contract_registered', conversion: 'contract_converted', renewal: 'contract_renewed' } as const;

/**
 * Signed contracts of a restaurant. Each operation (first contract, conversion of a
 * pilot, renewal) adds a row with its own file; a contract registered by mistake is
 * voided, never deleted. The contracts alone decide whether the team and the menu
 * are on; the restaurant only follows their billing start (the pilot's free trial).
 */
@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract) private readonly contracts: Repository<Contract>,
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    private readonly documents: DocumentsService,
    private readonly audit: AuditService,
    private readonly data: DataSource,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private today(): string {
    return businessDay(new Date(), this.config.get('REPORT_TZ', { infer: true }));
  }

  async list(restaurantId: string): Promise<ContractView[]> {
    const rows = await this.contracts.find({ where: { restaurantId }, relations: { document: true }, order: { createdAt: 'DESC' } });
    return rows.map((c) => ({
      id: c.id,
      kind: c.kind,
      origin: c.origin,
      previousId: c.previousId,
      signedOn: c.signedOn,
      startsOn: c.startsOn,
      endsOn: c.endsOn,
      effectiveEndsOn: c.effectiveEndsOn,
      trialDays: c.trialDays,
      trialEndedOn: c.trialEndedOn,
      trialEndReason: c.trialEndReason,
      signatory: { name: c.signatoryName, role: c.signatoryRole, contact: c.signatoryContact },
      document: documentView(c.document!),
      createdByName: c.createdByName,
      createdAt: c.createdAt.toISOString(),
      voided: c.voidedAt ? { at: c.voidedAt.toISOString(), byName: c.voidedByName ?? '', reason: c.voidReason ?? '' } : null,
    }));
  }

  async register(restaurantId: string, dto: ContractDto, actor: JwtUser): Promise<ContractView> {
    const doc = await this.documents.owned(restaurantId, dto.documentId, 'contract');
    const who = await this.audit.who(actor);
    const today = this.today();
    const trialDays = dto.trialDays ?? 0;

    const saved = await this.data.transaction(async (em) => {
      // One operation at a time per restaurant: two "first contracts" sent together cannot both pass.
      await this.lock(em, restaurantId);
      const existing = await em.find(Contract, { where: { restaurantId }, order: { createdAt: 'DESC' } });
      const problems = contractProblems({ ...dto, trialDays }, existing, today);
      if (problems.length) throw new BadRequestException({ statusCode: 400, message: 'invalid_contract', problems });
      if (await em.exists(Contract, { where: { documentId: doc.id } })) throw new ConflictException({ statusCode: 409, message: 'document_in_use', field: 'documentId' });
      const previous = latestContract(existing);

      if (dto.origin === 'conversion' && previous) {
        // Converting during the free trial ends it: billing starts with the definitive contract.
        const trial = trialStatus(existing, today);
        if (previous.origin === 'initial' && trial.billingStartsOn && dto.startsOn < trial.billingStartsOn && !previous.trialEndedOn) {
          await em.update(Contract, { id: previous.id }, { trialEndedOn: dto.startsOn, trialEndReason: 'conversion' });
        }
      }
      const row = await em.save(
        em.create(Contract, {
          restaurantId,
          kind: dto.kind,
          origin: dto.origin,
          previousId: previous?.id ?? null,
          signedOn: dto.signedOn,
          startsOn: dto.startsOn,
          endsOn: dto.endsOn,
          effectiveEndsOn: dto.endsOn,
          trialDays,
          signatoryName: dto.signatory.name,
          signatoryRole: dto.signatory.role,
          signatoryContact: dto.signatory.contact,
          documentId: doc.id,
          createdBy: who.id,
          createdByName: who.name,
        }),
      );
      await this.refresh(em, restaurantId);
      return row;
    });
    await this.audit.record(actor, ACTION[dto.origin], restaurantId, {
      meta: { kind: dto.kind, startsOn: dto.startsOn, endsOn: dto.endsOn, ...(trialDays ? { trialDays } : {}) },
    });
    return (await this.list(restaurantId)).find((c) => c.id === saved.id)!;
  }

  /**
   * Voids the latest contract (registered by mistake). It stays in the history; a
   * voided conversion gives the pilot back its days and, if it cut the trial, the trial.
   */
  async void(restaurantId: string, contractId: string, reason: string, actor: JwtUser): Promise<ContractView> {
    const who = await this.audit.who(actor);
    const voided = await this.data.transaction(async (em) => {
      await this.lock(em, restaurantId);
      const existing = await em.find(Contract, { where: { restaurantId } });
      const target = existing.find((c) => c.id === contractId);
      if (!target) throw new NotFoundException();
      if (target.voidedAt) throw new ConflictException('contract_already_voided');
      if (latestContract(existing)?.id !== target.id) throw new ConflictException('not_latest_contract');
      await em.update(Contract, { id: target.id }, { voidedAt: new Date(), voidedBy: who.id, voidedByName: who.name, voidReason: reason.trim() });
      const previous = existing.find((c) => c.id === target.previousId);
      if (target.origin === 'conversion' && previous?.trialEndReason === 'conversion') {
        await em.update(Contract, { id: previous.id }, { trialEndedOn: null, trialEndReason: null });
      }
      await this.refresh(em, restaurantId);
      return target;
    });
    await this.audit.record(actor, 'contract_voided', restaurantId, {
      meta: { reason: reason.trim(), kind: voided.kind, startsOn: voided.startsOn, endsOn: voided.endsOn },
    });
    return (await this.list(restaurantId)).find((c) => c.id === contractId)!;
  }

  /** Ends the pilot's free trial today: billing starts now, with the usual grace days. */
  async endTrial(restaurantId: string, reason: string, actor: JwtUser): Promise<void> {
    const today = this.today();
    const ended = await this.data.transaction(async (em) => {
      await this.lock(em, restaurantId);
      const existing = await em.find(Contract, { where: { restaurantId } });
      const trial = trialStatus(existing, today);
      if (trial.state !== 'running') throw new ConflictException('trial_over');
      const first = existing.find((c) => !c.voidedAt && c.origin === 'initial')!;
      await em.update(Contract, { id: first.id }, { trialEndedOn: today, trialEndReason: 'early' });
      await this.refresh(em, restaurantId);
      return trial;
    });
    await this.audit.record(actor, 'trial_ended', restaurantId, { meta: { reason: reason.trim(), from: ended.billingStartsOn } });
  }

  private async lock(em: EntityManager, restaurantId: string): Promise<Restaurant> {
    const r = await em.findOne(Restaurant, { where: { id: restaurantId }, loadEagerRelations: false, lock: { mode: 'pessimistic_write' } });
    if (!r) throw new NotFoundException();
    return r;
  }

  /**
   * Brings derived data in line with the contracts: each one's last covered day (for
   * the SQL filters) and the restaurant's first billed day, which is also its due
   * date while nothing was paid.
   */
  private async refresh(em: EntityManager, restaurantId: string): Promise<void> {
    const rows = await em.find(Contract, { where: { restaurantId } });
    const ends = effectiveEnds(rows);
    for (const c of rows) {
      const end = ends.get(c.id) ?? c.endsOn;
      if (c.effectiveEndsOn !== end) await em.update(Contract, { id: c.id }, { effectiveEndsOn: end });
    }
    const billing = trialStatus(rows, this.today()).billingStartsOn;
    if (!billing) return;
    const initialDueDate = dateOnly(billing)!;
    const paid = await em.findOne(Payment, { where: { restaurantId, voidedAt: IsNull() }, order: { createdAt: 'DESC' } });
    await em.update(Restaurant, { id: restaurantId }, { initialDueDate, dueDate: paid?.newDueDate ?? initialDueDate });
  }
}
