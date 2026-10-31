import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { type Availability, availability, isPauseActive, pauseEnd, type PauseList, pauseProblems, type PauseView } from '@elo/core';
import type { Env } from '../config/env';
import type { JwtUser } from '../common/auth-types';
import { AuditService } from '../audit/audit.service';
import { Restaurant, RestaurantPause } from '../database/entities';
import { RealtimeService } from '../realtime/realtime.service';
import type { CreatePauseDto } from './pauses.dto';

const PAST_PAGE_SIZE = 5;

const view = (p: RestaurantPause): PauseView => ({
  id: p.id,
  startsAt: p.startsAt.toISOString(),
  endsAt: p.endsAt?.toISOString() ?? null,
  endedAt: p.endedAt?.toISOString() ?? null,
  reason: p.reason,
  createdByName: p.createdByName,
  createdAt: p.createdAt.toISOString(),
});

/**
 * Opening hours plus temporary closures decide whether guests can open a table.
 * Tables already open keep going until the waiter closes them.
 */
@Injectable()
export class PausesService {
  private readonly cache = new Map<string, { pauses: RestaurantPause[]; until: number }>();

  constructor(
    @InjectRepository(RestaurantPause) private readonly pauses: Repository<RestaurantPause>,
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Closures that are running or still to come. */
  private async pending(restaurantId: string): Promise<RestaurantPause[]> {
    const hit = this.cache.get(restaurantId);
    if (hit && hit.until > Date.now()) return hit.pauses;
    const now = new Date();
    const rows = await this.pauses
      .createQueryBuilder('p')
      .where('p.restaurantId = :restaurantId', { restaurantId })
      .andWhere('(p.endedAt IS NULL OR p.endedAt > :now)', { now })
      .andWhere('(p.endsAt IS NULL OR p.endsAt > :now)', { now })
      .orderBy('p.startsAt', 'ASC')
      .take(50)
      .getMany();
    this.cache.set(restaurantId, { pauses: rows, until: Date.now() + 10_000 });
    return rows;
  }

  async of(restaurant: Pick<Restaurant, 'id' | 'openingHours'>): Promise<Availability> {
    return availability({
      hours: restaurant.openingHours,
      pauses: await this.pending(restaurant.id),
      now: new Date(),
      timeZone: this.config.get('REPORT_TZ', { infer: true }),
    });
  }

  /** Refuses a new table while the restaurant is closed or on a temporary closure. */
  async assertOpen(restaurantId: string): Promise<void> {
    const restaurant = await this.restaurants.findOne({ where: { id: restaurantId }, select: { id: true, openingHours: true } });
    if (!restaurant) throw new NotFoundException();
    const status = await this.of(restaurant);
    if (!status.open) throw new ConflictException({ statusCode: 409, message: 'restaurant_closed', availability: status });
  }

  async list(restaurantId: string, page = 1): Promise<PauseList> {
    const restaurant = await this.restaurants.findOneOrFail({ where: { id: restaurantId }, select: { id: true, openingHours: true } });
    // Closures that really happened; the ones cancelled before starting stay only in the activity log.
    const past = await this.pauses
      .createQueryBuilder('p')
      .where('p.restaurantId = :restaurantId', { restaurantId })
      .andWhere('((p.endedAt IS NOT NULL AND p.endedAt <= :now AND p.endedAt > p.startsAt) OR (p.endedAt IS NULL AND p.endsAt <= :now))', { now: new Date() })
      .orderBy('p.startsAt', 'DESC')
      .skip((page - 1) * PAST_PAGE_SIZE)
      .take(PAST_PAGE_SIZE)
      .getManyAndCount();
    return {
      availability: await this.of(restaurant),
      upcoming: (await this.pending(restaurantId)).map(view),
      past: { items: past[0].map(view), total: past[1], page, pageSize: PAST_PAGE_SIZE },
    };
  }

  async create(restaurantId: string, dto: CreatePauseDto, actor: JwtUser): Promise<PauseView> {
    const now = new Date();
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : now;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    const problems = pauseProblems({ startsAt, endsAt }, await this.pending(restaurantId), now);
    if (problems.length) throw new BadRequestException({ statusCode: 400, message: 'invalid_pause', problems });
    const who = await this.audit.who(actor);
    const pause = await this.pauses.save(
      this.pauses.create({ restaurantId, startsAt, endsAt, endedAt: null, reason: dto.reason || null, createdBy: who.id, createdByName: who.name }),
    );
    await this.audit.record(actor, 'pause_created', restaurantId, {
      meta: { startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null, reason: pause.reason },
    });
    await this.announce(restaurantId);
    return view(pause);
  }

  /** Ends a running closure now, or drops one that has not started yet. */
  async end(restaurantId: string, id: string, actor: JwtUser): Promise<void> {
    const now = new Date();
    const pause = await this.pauses.findOne({ where: { id, restaurantId, endedAt: IsNull() } });
    const end = pause ? pauseEnd(pause) : null;
    if (!pause || (end !== null && end <= now.getTime())) throw new NotFoundException('pause_not_found');
    const running = isPauseActive(pause, now);
    pause.endedAt = now;
    await this.pauses.save(pause);
    await this.audit.record(actor, 'pause_ended', restaurantId, { meta: { running, startsAt: pause.startsAt.toISOString(), reason: pause.reason } });
    await this.announce(restaurantId);
  }

  /** Tells open staff screens the new status, after a closure or the opening hours change. */
  async announce(restaurantId: string) {
    this.cache.delete(restaurantId);
    const restaurant = await this.restaurants.findOneOrFail({ where: { id: restaurantId }, select: { id: true, openingHours: true } });
    this.realtime.publish({ type: 'restaurant.availability', restaurantId, payload: await this.of(restaurant) });
  }
}
