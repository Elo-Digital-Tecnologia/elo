import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { contractProblems, type ContractView, coverage, dateOnly, effectiveEnds, toDay } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { AuditService } from '../audit/audit.service';
import { Contract, Payment, Restaurant } from '../database/entities';
import { documentView, DocumentsService } from '../documents/documents.service';
import type { ContractDto } from './contracts.dto';

const ACTION = { initial: 'contract_registered', conversion: 'contract_converted', renewal: 'contract_renewed' } as const;

/**
 * Signed contracts of a restaurant. Each operation (first contract, conversion of a
 * pilot, renewal) adds a row with its own file; the restaurant keeps a cached copy
 * of the coverage, which decides whether its team and menu are on.
 */
@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract) private readonly contracts: Repository<Contract>,
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    private readonly documents: DocumentsService,
    private readonly audit: AuditService,
    private readonly data: DataSource,
  ) {}

  async list(restaurantId: string): Promise<ContractView[]> {
    const rows = await this.contracts.find({ where: { restaurantId }, relations: { document: true }, order: { createdAt: 'DESC' } });
    const ends = effectiveEnds(rows);
    return rows.map((c) => ({
      id: c.id,
      kind: c.kind,
      origin: c.origin,
      previousId: c.previousId,
      signedOn: c.signedOn,
      startsOn: c.startsOn,
      endsOn: c.endsOn,
      effectiveEndsOn: ends.get(c.id) ?? c.endsOn,
      signatory: { name: c.signatoryName, role: c.signatoryRole, contact: c.signatoryContact },
      document: documentView(c.document!),
      createdByName: c.createdByName,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async register(restaurantId: string, dto: ContractDto, actor: JwtUser): Promise<ContractView> {
    const restaurant = await this.restaurants.findOne({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException();
    const existing = await this.contracts.find({ where: { restaurantId }, order: { createdAt: 'DESC' } });
    const today = toDay(new Date());
    const problems = contractProblems(dto, existing, today);
    if (problems.length) throw new BadRequestException({ statusCode: 400, message: 'invalid_contract', problems });
    const doc = await this.documents.owned(restaurantId, dto.documentId, 'contract');
    if (await this.contracts.exist({ where: { documentId: doc.id } })) throw new ConflictException({ statusCode: 409, message: 'document_in_use', field: 'documentId' });
    const who = await this.audit.who(actor);

    const saved = await this.data.transaction(async (em) => {
      const row = await em.save(
        em.create(Contract, {
          restaurantId,
          kind: dto.kind,
          origin: dto.origin,
          previousId: existing[0]?.id ?? null,
          signedOn: dto.signedOn,
          startsOn: dto.startsOn,
          endsOn: dto.endsOn,
          signatoryName: dto.signatory.name,
          signatoryRole: dto.signatory.role,
          signatoryContact: dto.signatory.contact,
          documentId: doc.id,
          createdBy: who.id,
          createdByName: who.name,
        }),
      );
      const span = coverage([...existing, row], today);
      const update: Partial<Restaurant> = { contractStartsOn: span?.startsOn ?? null, contractEndsOn: span?.endsOn ?? null };
      // The trial counts from the start of the first contract, while nothing was paid yet.
      if (!existing.length && !(await em.exists(Payment, { where: { restaurantId, voidedAt: IsNull() } }))) {
        const firstDue = new Date(dateOnly(dto.startsOn)!.getTime() + restaurant.trialDays * 86_400_000);
        Object.assign(update, { initialDueDate: firstDue, dueDate: firstDue });
      }
      await em.update(Restaurant, { id: restaurantId }, update);
      return row;
    });
    await this.audit.record(actor, ACTION[dto.origin], restaurantId, {
      meta: { kind: dto.kind, startsOn: dto.startsOn, endsOn: dto.endsOn },
    });
    return (await this.list(restaurantId)).find((c) => c.id === saved.id)!;
  }
}

