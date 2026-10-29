import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { unlink } from 'fs/promises';
import * as path from 'path';
import { DataSource, IsNull, LessThan, Not, Repository } from 'typeorm';
import { AccessState } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import type { Env } from '../config/env';
import {
  AuditLog,
  Category,
  DiningTable,
  Media,
  Order,
  Payment,
  Product,
  Restaurant,
  Review,
  StaffUser,
  WaiterCall,
} from '../database/entities';
import { RealtimeService } from '../realtime/realtime.service';
import { RestaurantsService } from './restaurants.service';

const DAY_MS = 86_400_000;
/** How often the purge looks for restaurants past their retention period. */
const PURGE_EVERY_MS = 6 * 3_600_000;

/**
 * Deleting a restaurant is two-step: it must be suspended first, then it is
 * soft-deleted (hidden everywhere, restorable, exportable) and only erased
 * for good after `RESTAURANT_PURGE_DAYS`.
 */
@Injectable()
export class RestaurantLifecycleService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger(RestaurantLifecycleService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(AuditLog) private readonly audit: Repository<AuditLog>,
    @InjectDataSource() private readonly db: DataSource,
    private readonly service: RestaurantsService,
    private readonly realtime: RealtimeService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.runPurge(), PURGE_EVERY_MS);
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  /** Suspending also drops the team's live connections, so screens stop at once. */
  async setSuspended(id: string, suspended: boolean, actor: JwtUser): Promise<Restaurant> {
    const r = await this.service.setSuspended(id, suspended);
    if (suspended) this.realtime.disconnectRestaurant(id);
    await this.record(actor.sub, suspended ? 'restaurant_suspended' : 'restaurant_reactivated', id);
    return r;
  }

  async remove(id: string, actor: JwtUser, confirmSlug: string): Promise<void> {
    const r = await this.service.get(id);
    if (confirmSlug.trim() !== r.slug) throw new BadRequestException('slug_mismatch');
    if ((await this.service.accessStateOf(id)) !== AccessState.Suspended) throw new ConflictException('not_suspended');
    await this.restaurants.update({ id }, { deletedAt: new Date(), deletedBy: actor.sub });
    this.realtime.disconnectRestaurant(id);
    await this.record(actor.sub, 'restaurant_deleted', id);
  }

  /** Back as a suspended restaurant: someone still has to reactivate it on purpose. */
  async restore(id: string, actor: JwtUser): Promise<Restaurant> {
    const r = await this.restaurants.findOne({ where: { id, deletedAt: Not(IsNull()) }, withDeleted: true });
    if (!r) throw new NotFoundException();
    await this.restaurants.update({ id }, { deletedAt: null, deletedBy: null, suspended: true });
    await this.record(actor.sub, 'restaurant_restored', id);
    return this.service.get(id);
  }

  /** Everything the restaurant may ask back, without secrets (password hashes, table tokens). */
  async export(id: string) {
    const restaurant = await this.restaurants.findOne({ where: { id }, withDeleted: true });
    if (!restaurant) throw new NotFoundException();
    const em = this.db.manager;
    const where = { restaurantId: id };
    const [staff, categories, products, tables, orders, calls, payments, reviews] = await Promise.all([
      em.find(StaffUser, { where }),
      em.find(Category, { where }),
      em.find(Product, { where }),
      em.find(DiningTable, { where }),
      em.find(Order, { where, order: { createdAt: 'ASC' } }),
      em.find(WaiterCall, { where, order: { createdAt: 'ASC' } }),
      em.find(Payment, { where, order: { paidAt: 'ASC' } }),
      em.find(Review, { where, order: { createdAt: 'ASC' } }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      restaurant,
      staff: staff.map(({ passwordHash: _hash, ...rest }) => rest),
      categories,
      products,
      tables: tables.map(({ token: _token, ...rest }) => rest),
      orders,
      calls,
      payments,
      reviews,
    };
  }

  /**
   * Erases every restaurant deleted more than `RESTAURANT_PURGE_DAYS` ago:
   * all rows carrying its id and its image files. `ids` narrows the run
   * (tests). The audit log is kept as the record that it happened.
   */
  async purgeExpired(opts: { now?: Date; ids?: string[] } = {}): Promise<string[]> {
    const days = this.config.get('RESTAURANT_PURGE_DAYS', { infer: true });
    const cutoff = new Date((opts.now ?? new Date()).getTime() - days * DAY_MS);
    const due = await this.restaurants.find({ where: { deletedAt: LessThan(cutoff) }, withDeleted: true, select: { id: true } });
    const ids = due.map((r) => r.id).filter((id) => !opts.ids || opts.ids.includes(id));
    for (const id of ids) await this.purge(id);
    return ids;
  }

  private async runPurge() {
    try {
      const ids = await this.purgeExpired();
      if (ids.length) this.log.log(`Purged ${ids.length} deleted restaurant(s)`);
    } catch (e) {
      this.log.error(`Purge failed: ${(e as Error).message}`);
    }
  }

  private async purge(id: string) {
    const media = await this.db.manager.find(Media, { where: { restaurantId: id }, select: { id: true } });
    await this.db.transaction(async (em) => {
      const tables: { table_name: string }[] = await em.query(
        `SELECT table_name FROM information_schema.columns
         WHERE table_schema = current_schema() AND column_name = 'restaurant_id' AND table_name <> 'audit_log'`,
      );
      for (const { table_name } of tables) await em.query(`DELETE FROM "${table_name}" WHERE "restaurant_id" = $1`, [id]);
      await em.query(`DELETE FROM "restaurants" WHERE "id" = $1`, [id]);
      await em.getRepository(AuditLog).save(em.getRepository(AuditLog).create({ actor: 'system', action: 'restaurant_purged', restaurantId: id }));
    });
    const dir = this.config.get('UPLOAD_DIR', { infer: true });
    const files = media.flatMap((m) => [`${m.id}.webp`, `${m.id}-sm.webp`]);
    await Promise.all(files.map((f) => unlink(path.join(dir, f)).catch(() => undefined)));
  }

  private record(actor: string, action: string, restaurantId: string) {
    return this.audit.save(this.audit.create({ actor, action, restaurantId }));
  }
}
