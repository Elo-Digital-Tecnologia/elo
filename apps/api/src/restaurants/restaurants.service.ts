import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, type SelectQueryBuilder } from 'typeorm';
import {
  AccessState,
  accessState,
  dateOnly,
  GRACE_DAYS,
  isReservedSlug,
  type RestaurantListItem,
  type RestaurantListStatus,
  type RestaurantListView,
  type RestaurantProfileView,
  Role,
  slugify,
  type SuspensionReason,
  suspensionReasons,
} from '@elo/core';
import type { Env } from '../config/env';
import type { JwtUser } from '../common/auth-types';
import { AuditService } from '../audit/audit.service';
import { Plan, Restaurant } from '../database/entities';
import { PausesService } from '../pauses/pauses.service';
import { StaffService } from '../staff/staff.service';
import type { RestaurantListQuery } from './restaurants.dto';

export interface NewRestaurant {
  name: string;
  slug?: string;
  managerName: string;
  managerContact: string;
  planId: string;
  /** End of the trial, YYYY-MM-DD. */
  initialDueDate: string;
  serviceFeeBps?: number;
  adminUsername: string;
  adminPassword: string;
}

export interface SubscriptionInfo {
  state: AccessState;
  dueDate: Date;
  graceEndsAt: Date;
  /** Aviso de vencimento mostrado no dashboard do restaurante. */
  warning: boolean;
  reasons: SuspensionReason[];
  plan: { id: string; name: string; priceCents: number; cycleMonths: number } | null;
}

const DAY_MS = 86_400_000;

/** SQL twin of `accessState` from core; `:grace` is `GRACE_DAYS`. */
const STATUS_SQL: Record<'active' | 'grace' | 'suspended', string> = {
  active: `(r.suspended = false AND r.dueDate >= now())`,
  grace: `(r.suspended = false AND r.dueDate < now() AND r.dueDate >= now() - make_interval(days => :grace))`,
  suspended: `(r.suspended = true OR r.dueDate < now() - make_interval(days => :grace))`,
};

function applyStatus(qb: SelectQueryBuilder<Restaurant>, status: Exclude<RestaurantListStatus, 'deleted'>) {
  const sql = status === 'attention' ? `(${STATUS_SQL.grace} OR ${STATUS_SQL.suspended})` : STATUS_SQL[status];
  qb.andWhere(sql, { grace: GRACE_DAYS });
}

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    private readonly staff: StaffService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
    private readonly pauses: PausesService,
  ) {}

  /** Perfil que qualquer cliente pode ver no cardápio. O Wi-Fi fica de fora. */
  async publicProfile(r: Restaurant): Promise<RestaurantProfileView> {
    return {
      description: r.description,
      logoUrl: r.logoUrl,
      coverUrl: r.coverUrl,
      address: r.address,
      phone: r.phone,
      instagram: r.instagram,
      availability: await this.pauses.of(r),
    };
  }

  /** Token de administrador do restaurante para a equipe Elo; dura 45 min e fica registrado. */
  async accessAs(id: string, actor: JwtUser): Promise<{ accessToken: string; slug: string }> {
    const restaurant = await this.get(id);
    await this.audit.record(actor, 'restaurant_access', id);
    const payload: JwtUser = {
      sub: `elo:${actor.sub}`,
      roles: [Role.RestaurantAdmin],
      name: `${actor.name ?? 'Equipe'} (Elo Digital)`,
      restaurantId: id,
      permissions: [],
      impersonatedBy: actor.sub,
    };
    return { accessToken: await this.jwt.signAsync(payload, { expiresIn: '45m' }), slug: restaurant.slug };
  }

  async create(data: NewRestaurant): Promise<Restaurant> {
    const slug = data.slug ?? slugify(data.name);
    if (!slug) throw new ConflictException('invalid_slug');
    if (isReservedSlug(slug)) throw new ConflictException('slug_reserved');
    // A deleted restaurant keeps its slug until it is purged.
    if (await this.restaurants.findOne({ where: { slug }, withDeleted: true })) {
      throw new ConflictException('slug_taken');
    }
    const due = dateOnly(data.initialDueDate);
    if (!due) throw new BadRequestException({ message: 'invalid_date', field: 'initialDueDate' });
    const plan = await this.plans.findOne({ where: { id: data.planId } });
    if (!plan) throw new NotFoundException('plan_not_found');
    if (!plan.active) throw new ConflictException('plan_inactive');
    const restaurant = await this.restaurants.save(
      this.restaurants.create({
        slug,
        name: data.name,
        managerName: data.managerName,
        managerContact: data.managerContact,
        dueDate: due,
        initialDueDate: due,
        planId: plan.id,
        plan,
        serviceFeeBps: data.serviceFeeBps ?? 1000,
      }),
    );
    await this.staff.create({
      restaurantId: restaurant.id,
      username: data.adminUsername,
      password: data.adminPassword,
      name: data.managerName,
      roles: [Role.RestaurantAdmin],
    });
    return restaurant;
  }

  /**
   * Elo restaurant list: search, subscription status, due soon, sorting and
   * pages, all in the database so it keeps up as the list grows.
   */
  async search(q: RestaurantListQuery, canSeeDeleted: boolean): Promise<RestaurantListView> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const base = () => {
      const qb = this.restaurants.createQueryBuilder('r').leftJoinAndSelect('r.plan', 'plan');
      const term = q.q?.trim();
      if (term) {
        qb.andWhere(
          new Brackets((w) =>
            w.where('r.name ILIKE :term', { term: `%${term}%` })
              .orWhere('r.slug ILIKE :term')
              .orWhere('r.managerName ILIKE :term'),
          ),
        );
      }
      if (q.dueWithin) {
        qb.andWhere(`r.suspended = false AND r.dueDate >= now() AND r.dueDate < now() + make_interval(days => :within)`, { within: q.dueWithin });
      }
      return qb;
    };

    const counted = await base()
      .withDeleted()
      .select(`COUNT(*) FILTER (WHERE r.deletedAt IS NULL)::int`, 'all')
      .addSelect(`COUNT(*) FILTER (WHERE r.deletedAt IS NULL AND ${STATUS_SQL.active})::int`, 'active')
      .addSelect(`COUNT(*) FILTER (WHERE r.deletedAt IS NULL AND ${STATUS_SQL.grace})::int`, 'grace')
      .addSelect(`COUNT(*) FILTER (WHERE r.deletedAt IS NULL AND ${STATUS_SQL.suspended})::int`, 'suspended')
      .addSelect(`COUNT(*) FILTER (WHERE r.deletedAt IS NOT NULL)::int`, 'deleted')
      .setParameter('grace', GRACE_DAYS)
      .getRawOne<{ all: number; active: number; grace: number; suspended: number; deleted: number }>();

    const qb = base();
    if (q.status === 'deleted') qb.withDeleted().andWhere('r.deletedAt IS NOT NULL');
    else if (q.status) applyStatus(qb, q.status);
    const order = q.sort === 'due' ? ['r.dueDate', 'ASC'] : q.sort === 'created' ? ['r.createdAt', 'DESC'] : ['r.name', 'ASC'];
    const [rows, total] = await qb
      .orderBy(order[0], order[1] as 'ASC' | 'DESC')
      .addOrderBy('r.name', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const { deleted, ...counts } = counted ?? { all: 0, active: 0, grace: 0, suspended: 0, deleted: 0 };
    return {
      items: rows.map((r) => this.listItem(r)),
      total,
      page,
      pageSize,
      counts: canSeeDeleted ? { ...counts, deleted } : counts,
    };
  }

  listItem(r: Restaurant): RestaurantListItem {
    const purgeDays = this.config.get('RESTAURANT_PURGE_DAYS', { infer: true });
    const sub = this.subscriptionOf(r);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      managerName: r.managerName,
      managerContact: r.managerContact,
      dueDate: r.dueDate.toISOString(),
      suspended: r.suspended,
      createdAt: r.createdAt.toISOString(),
      subscription: { ...sub, dueDate: sub.dueDate.toISOString(), graceEndsAt: sub.graceEndsAt.toISOString() },
      deletedAt: r.deletedAt?.toISOString() ?? null,
      purgeAt: r.deletedAt ? new Date(r.deletedAt.getTime() + purgeDays * DAY_MS).toISOString() : null,
    };
  }

  async edit(id: string, data: { name?: string; managerName?: string; managerContact?: string }, actor: JwtUser): Promise<Restaurant> {
    const r = await this.get(id);
    const fields = changedFields(r, data);
    Object.assign(r, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
    const saved = await this.restaurants.save(r);
    if (fields.length) await this.audit.record(actor, 'restaurant_edited', id, { meta: { fields } });
    return saved;
  }

  async get(id: string): Promise<Restaurant> {
    const r = await this.restaurants.findOne({ where: { id } });
    if (!r) throw new NotFoundException();
    return r;
  }

  async getBySlug(slug: string): Promise<Restaurant> {
    const r = await this.restaurants.findOne({ where: { slug } });
    if (!r) throw new NotFoundException();
    return r;
  }

  async isDeleted(restaurantId: string): Promise<boolean> {
    const r = await this.restaurants.findOne({ where: { id: restaurantId }, withDeleted: true, select: { id: true, deletedAt: true } });
    return !r || !!r.deletedAt;
  }

  /** A deleted restaurant counts as suspended: its team is locked out, Elo support included. */
  async accessStateOf(restaurantId: string): Promise<AccessState> {
    const r = await this.restaurants.findOne({ where: { id: restaurantId }, withDeleted: true });
    if (!r) throw new NotFoundException();
    return r.deletedAt ? AccessState.Suspended : this.stateOf(r);
  }

  subscriptionOf(r: Restaurant, now = new Date()): SubscriptionInfo {
    const state = accessState(r.dueDate, now, r.suspended);
    return {
      state,
      dueDate: r.dueDate,
      graceEndsAt: new Date(r.dueDate.getTime() + GRACE_DAYS * DAY_MS),
      warning: state === AccessState.Grace,
      reasons: suspensionReasons(r.dueDate, r.suspended, now),
      plan: r.plan ? { id: r.plan.id, name: r.plan.name, priceCents: r.plan.priceCents, cycleMonths: r.plan.cycleMonths } : null,
    };
  }

  async updateSettings(
    id: string,
    data: Partial<Pick<Restaurant, 'description' | 'logoUrl' | 'coverUrl' | 'address' | 'phone' | 'instagram' | 'wifiName' | 'wifiPassword' | 'openingHours' | 'guestFeeRefusal'>> &
      Pick<Restaurant, 'name' | 'managerName' | 'managerContact' | 'serviceFeeBps'>,
    actor?: JwtUser,
  ): Promise<Restaurant> {
    const r = await this.get(id);
    const fields = changedFields(r, data);
    // Campos não enviados ficam como estão; só o que veio (inclusive nulo) é gravado.
    Object.assign(r, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
    const saved = await this.restaurants.save(r);
    if (fields.length && actor) await this.audit.record(actor, 'settings_updated', id, { meta: { fields } });
    return saved;
  }

  async setSuspended(id: string, suspended: boolean): Promise<Restaurant> {
    const r = await this.get(id);
    r.suspended = suspended;
    return this.restaurants.save(r);
  }

  async overview() {
    const all = await this.restaurants.find();
    const counts = { total: all.length, active: 0, grace: 0, suspended: 0 };
    for (const r of all) counts[this.stateOf(r)]++;
    return counts;
  }

  private stateOf(r: Restaurant): AccessState {
    return accessState(r.dueDate, new Date(), r.suspended);
  }
}

/** Names of the fields a change really alters, for the activity log (values stay out of it). */
function changedFields(current: object, next: object): string[] {
  const now = current as Record<string, unknown>;
  return Object.entries(next)
    .filter(([k, v]) => v !== undefined && JSON.stringify(v) !== JSON.stringify(now[k] instanceof Date ? (now[k] as Date).toISOString() : now[k]))
    .map(([k]) => k);
}
