import type {
    RestaurantListItem,
    RestaurantListStatus,
    RestaurantListView,
    RestaurantProfileView,
    SubscriptionView
} from '@elo/core/api/views/restaurant.view';
import type { SuspensionReason } from '@elo/core/billing/billing';
import type { BillingPlan, TrialStatus } from '@elo/core/contracts/contracts';
import type { RestaurantStatus } from '@elo/core/subscription/subscription';
import type { SelectQueryBuilder } from 'typeorm';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { EnvConfig } from '#/config/env.js';
import type { ListRestaurantsQueryDTO } from './dto/list-restaurants-query.dto.js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { dateOnly, suspensionReasons } from '@elo/core/billing/billing';
import {
    CONTRACT_LIMITS,
    businessDay,
    contractSummary,
    planInForce,
    shiftDay,
    trialStatus,
    voidedLatest
} from '@elo/core/contracts/contracts';
import { Role } from '@elo/core/roles/roles';
import { isReservedSlug, slugify } from '@elo/core/slug/slug';
import {
    AccessState,
    GRACE_DAYS,
    accessState,
    restaurantStatus
} from '@elo/core/subscription/subscription';
import { MS_PER_DAY } from '@elo/core/time/time-units';
import { Brackets, In, Repository } from 'typeorm';
import { AuditLogService } from '#/modules/audit-logs/audit-log.service.js';
import { PlanEntity } from '#/modules/billing/entities/plan.entity.js';
import { PlanInactiveException } from '#/modules/billing/exceptions/plan-inactive.exception.js';
import { PlanNotFoundException } from '#/modules/billing/exceptions/plan-not-found.exception.js';
import { amendmentOf } from '#/modules/billing/utils/due-date.js';
import { ContractEntity } from '#/modules/contracts/entities/contract.entity.js';
import { PauseService } from '#/modules/pauses/pause.service.js';
import { StaffService } from '#/modules/staff/staff.service.js';
import { RestaurantEntity } from './entities/restaurant.entity.js';
import { InvalidSlugException } from './exceptions/invalid-slug.exception.js';
import { MenuUnavailableException } from './exceptions/menu-unavailable.exception.js';
import { NothingToSuspendException } from './exceptions/nothing-to-suspend.exception.js';
import { RestaurantNotFoundException } from './exceptions/restaurant-not-found.exception.js';
import { SlugReservedException } from './exceptions/slug-reserved.exception.js';
import { SlugTakenException } from './exceptions/slug-taken.exception.js';
import { RESTAURANT_LIST_LIMITS } from './restaurant.constants.js';
import { restaurantBySlug, slugTaken } from './utils/restaurant-slug.js';

export interface CreateRestaurantInput {
    name: string;
    slug?: string;
    managerName: string;
    managerContact: string;
    planId?: string;
    serviceFeeBps?: number;
    adminUsername: string;
    adminPassword: string;
}

export interface SubscriptionInfo {
    state: AccessState;
    dueDate: Date;
    graceEndsAt: Date;
    /** Due date warning shown on the restaurant dashboard. */
    warning: boolean;
    reasons: SuspensionReason[];
    plan: BillingPlan | null;
    status: RestaurantStatus;
    trial: TrialStatus;
    contract: SubscriptionView['contract'];
}

/** Contracts that count, of the restaurant `r` in the query. */
const LIVE = `FROM contracts c WHERE c.restaurant_id = r.id AND c.voided_at IS NULL`;
/** A contract covers `:today` (the business day). */
const IN_FORCE = `EXISTS (SELECT 1 ${LIVE} AND c.starts_on <= :today AND c.effective_ends_on >= :today)`;
const STARTED = `EXISTS (SELECT 1 ${LIVE} AND c.starts_on <= :today)`;
const OK_PAYMENTS = `(r.suspended = false AND r.dueDate >= now() - make_interval(days => :grace))`;

/** SQL twin of `restaurantStatus` from core: every restaurant lands in one bucket. `:grace` is `GRACE_DAYS`. */
const STATUS_SQL: Record<
    'active' | 'grace' | 'suspended' | 'pending' | 'ended' | 'ending',
    string
> = {
    pending: `(NOT ${STARTED})`,
    ended: `(${STARTED} AND NOT ${IN_FORCE})`,
    active: `(${IN_FORCE} AND r.suspended = false AND r.dueDate >= now())`,
    grace: `(${IN_FORCE} AND ${OK_PAYMENTS} AND r.dueDate < now())`,
    suspended: `(${IN_FORCE} AND NOT ${OK_PAYMENTS})`,
    /** In force, but nothing covers the first day past the warning window (`:beyond`). */
    ending: `(${IN_FORCE} AND NOT EXISTS (SELECT 1 ${LIVE} AND c.starts_on <= :beyond AND c.effective_ends_on >= :beyond))`
};

const statusParams = (today: string) => ({
    grace: GRACE_DAYS,
    today,
    beyond: shiftDay(today, CONTRACT_LIMITS.warnDays + 1)
});

function applyStatus(
    qb: SelectQueryBuilder<RestaurantEntity>,
    status: Exclude<RestaurantListStatus, 'deleted'>,
    today: string
) {
    const sql =
        status === 'attention'
            ? `(${STATUS_SQL.grace} OR ${STATUS_SQL.suspended} OR ${STATUS_SQL.pending} OR ${STATUS_SQL.ended} OR ${STATUS_SQL.ending})`
            : STATUS_SQL[status];
    qb.andWhere(sql, statusParams(today));
}

@Injectable()
export class RestaurantService {
    constructor(
        @InjectRepository(RestaurantEntity)
        private readonly restaurants: Repository<RestaurantEntity>,
        @InjectRepository(PlanEntity) private readonly plans: Repository<PlanEntity>,
        @InjectRepository(ContractEntity)
        private readonly contracts: Repository<ContractEntity>,
        private readonly staff: StaffService,
        private readonly jwt: JwtService,
        private readonly configService: ConfigService<EnvConfig, true>,
        private readonly audit: AuditLogService,
        private readonly pauses: PauseService
    ) {}

    /** Profile any guest can see on the menu. The Wi-Fi is left out. */
    public async publicProfile(r: RestaurantEntity): Promise<RestaurantProfileView> {
        return {
            description: r.description,
            logoUrl: r.logoUrl,
            coverUrl: r.coverUrl,
            address: r.address,
            phone: r.phone,
            instagram: r.instagram,
            googleReviewUrl: r.googleReviewUrl,
            availability: await this.pauses.of(r)
        };
    }

    /** Restaurant admin token for the Elo team; it lasts 45 minutes and is recorded. */
    public async accessAs(
        id: string,
        actor: JwtUser
    ): Promise<{ accessToken: string; slug: string }> {
        const restaurant = await this.get(id);
        await this.audit.record(actor, 'restaurant_access', id);
        const payload: JwtUser = {
            sub: `elo:${actor.sub}`,
            roles: [Role.RESTAURANT_ADMIN],
            name: `${actor.name ?? 'Equipe'} (Elo Digital)`,
            restaurantId: id,
            permissions: [],
            impersonatedBy: actor.sub,
            sid: actor.sid
        };
        return {
            accessToken: await this.jwt.signAsync(payload, { expiresIn: '45m' }),
            slug: restaurant.slug
        };
    }

    public async create(data: CreateRestaurantInput): Promise<RestaurantEntity> {
        const slug = data.slug ?? slugify(data.name);
        if (!slug) throw new InvalidSlugException('slug');
        if (isReservedSlug(slug)) throw new SlugReservedException('slug');
        // A deleted restaurant keeps its slug until it is purged; an old link stays reserved.
        if (await slugTaken(this.restaurants.manager, slug)) {
            throw new SlugTakenException('slug');
        }
        // Placeholder until the first contract sets when billing starts; ignored while pending.
        const due = dateOnly(this.today())!;
        const plan = data.planId
            ? await this.plans.findOne({ where: { id: data.planId } })
            : null;
        if (data.planId && !plan) throw new PlanNotFoundException();
        if (plan && !plan.active) throw new PlanInactiveException();
        const restaurant = await this.restaurants.save(
            this.restaurants.create({
                slug,
                name: data.name,
                managerName: data.managerName,
                managerContact: data.managerContact,
                dueDate: due,
                initialDueDate: due,
                planId: plan?.id ?? null,
                plan,
                serviceFeeBps: data.serviceFeeBps ?? 0
            })
        );
        await this.staff.create({
            restaurantId: restaurant.id,
            username: data.adminUsername,
            password: data.adminPassword,
            name: data.managerName,
            roles: [Role.RESTAURANT_ADMIN]
        });
        return restaurant;
    }

    /**
     * Elo restaurant list: search, subscription status, due soon, sorting and
     * pages, all in the database so it keeps up as the list grows.
     */
    public async search(
        q: ListRestaurantsQueryDTO,
        canSeeDeleted: boolean
    ): Promise<RestaurantListView> {
        const page = q.page ?? 1;
        const pageSize = q.pageSize ?? RESTAURANT_LIST_LIMITS.pageSize;
        const base = () => {
            const qb = this.restaurants
                .createQueryBuilder('r')
                .leftJoinAndSelect('r.plan', 'plan');
            const term = q.q?.trim();
            if (term) {
                qb.andWhere(
                    new Brackets((w) =>
                        w
                            .where('r.name ILIKE :term', { term: `%${term}%` })
                            .orWhere('r.slug ILIKE :term')
                            .orWhere('r.managerName ILIKE :term')
                    )
                );
            }
            if (q.dueWithin) {
                // Only billing that runs: a pending restaurant's placeholder due date is not a due date.
                qb.andWhere(
                    `r.suspended = false AND r.dueDate >= now() AND r.dueDate < now() + make_interval(days => :within) AND ${IN_FORCE}`,
                    { within: q.dueWithin, today: this.today() }
                );
            }
            return qb;
        };

        const today = this.today();
        const counted = await base()
            .withDeleted()
            .select(`COUNT(*) FILTER (WHERE r.deletedAt IS NULL)::int`, 'all')
            .addSelect(
                `COUNT(*) FILTER (WHERE r.deletedAt IS NULL AND ${STATUS_SQL.active})::int`,
                'active'
            )
            .addSelect(
                `COUNT(*) FILTER (WHERE r.deletedAt IS NULL AND ${STATUS_SQL.grace})::int`,
                'grace'
            )
            .addSelect(
                `COUNT(*) FILTER (WHERE r.deletedAt IS NULL AND ${STATUS_SQL.suspended})::int`,
                'suspended'
            )
            .addSelect(
                `COUNT(*) FILTER (WHERE r.deletedAt IS NULL AND ${STATUS_SQL.pending})::int`,
                'pending'
            )
            .addSelect(
                `COUNT(*) FILTER (WHERE r.deletedAt IS NULL AND ${STATUS_SQL.ended})::int`,
                'ended'
            )
            .addSelect(`COUNT(*) FILTER (WHERE r.deletedAt IS NOT NULL)::int`, 'deleted')
            .setParameters(statusParams(today))
            .getRawOne<{
                all: number;
                active: number;
                grace: number;
                suspended: number;
                pending: number;
                ended: number;
                deleted: number;
            }>();

        const qb = base();
        if (q.status === 'deleted') qb.withDeleted().andWhere('r.deletedAt IS NOT NULL');
        else if (q.status) applyStatus(qb, q.status, today);
        const order =
            q.sort === 'due'
                ? ['r.dueDate', 'ASC']
                : q.sort === 'created'
                  ? ['r.createdAt', 'DESC']
                  : ['r.name', 'ASC'];
        const [rows, total] = await qb
            .orderBy(order[0] ?? 'r.name', order[1] as 'ASC' | 'DESC')
            .addOrderBy('r.name', 'ASC')
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        const { deleted, ...counts } = counted ?? {
            all: 0,
            active: 0,
            grace: 0,
            suspended: 0,
            pending: 0,
            ended: 0,
            deleted: 0
        };
        const terms = await this.termsOf(rows.map((r) => r.id));
        return {
            items: rows.map((r) => this.listItem(r, terms.get(r.id) ?? [])),
            total,
            page,
            pageSize,
            counts: canSeeDeleted ? { ...counts, deleted } : counts
        };
    }

    public listItem(r: RestaurantEntity, terms: ContractEntity[]): RestaurantListItem {
        const purgeMs = this.configService.getOrThrow('retention.restaurantPurgeMs', {
            infer: true
        });
        const sub = this.subscriptionOf(r, terms);
        return {
            id: r.id,
            slug: r.slug,
            name: r.name,
            managerName: r.managerName,
            managerContact: r.managerContact,
            dueDate: r.dueDate.toISOString(),
            suspended: r.suspended,
            createdAt: r.createdAt.toISOString(),
            subscription: {
                ...sub,
                dueDate: sub.dueDate.toISOString(),
                graceEndsAt: sub.graceEndsAt.toISOString()
            },
            deletedAt: r.deletedAt?.toISOString() ?? null,
            purgeAt: r.deletedAt
                ? new Date(r.deletedAt.getTime() + purgeMs).toISOString()
                : null
        };
    }

    public async edit(
        id: string,
        data: { name?: string; managerName?: string; managerContact?: string },
        actor: JwtUser
    ): Promise<RestaurantEntity> {
        const r = await this.get(id);
        const fields = changedFields(r, data);
        Object.assign(
            r,
            Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
        );
        const saved = await this.restaurants.save(r);
        if (fields.length)
            await this.audit.record(actor, 'restaurant_edited', id, { meta: { fields } });
        return saved;
    }

    public async get(id: string): Promise<RestaurantEntity> {
        const r = await this.restaurants.findOne({ where: { id } });
        if (!r) throw new RestaurantNotFoundException();
        return r;
    }

    public async getBySlug(slug: string): Promise<RestaurantEntity> {
        const r = await restaurantBySlug(this.restaurants.manager, slug);
        if (!r) throw new RestaurantNotFoundException();
        return r;
    }

    public async isDeleted(restaurantId: string): Promise<boolean> {
        const r = await this.restaurants.findOne({
            where: { id: restaurantId },
            withDeleted: true,
            select: { id: true, deletedAt: true }
        });
        return !r || !!r.deletedAt;
    }

    /** A deleted restaurant counts as suspended: its team is locked out, Elo support included. */
    public async accessStateOf(restaurantId: string): Promise<AccessState> {
        const r = await this.restaurants.findOne({
            where: { id: restaurantId },
            withDeleted: true
        });
        if (!r) throw new RestaurantNotFoundException();
        return r.deletedAt ? AccessState.SUSPENDED : (await this.subscription(r)).state;
    }

    /** The calendar day in the business time zone: contracts and trials turn over at local midnight. */
    public today(now = new Date()): string {
        return businessDay(
            now,
            this.configService.getOrThrow('app.timeZone', { infer: true })
        );
    }

    /** Contracts of the given restaurants (voided ones included; the rules skip them), in one query. */
    public async termsOf(
        restaurantIds: string[]
    ): Promise<Map<string, ContractEntity[]>> {
        const out = new Map<string, ContractEntity[]>();
        if (!restaurantIds.length) return out;
        for (const c of await this.contracts.find({
            where: { restaurantId: In(restaurantIds) },
            order: { createdAt: 'ASC' }
        })) {
            out.set(c.restaurantId, [...(out.get(c.restaurantId) ?? []), c]);
        }
        return out;
    }

    public async subscription(
        r: RestaurantEntity,
        now = new Date()
    ): Promise<SubscriptionInfo> {
        return this.subscriptionOf(r, (await this.termsOf([r.id])).get(r.id) ?? [], now);
    }

    /** Subscription of a restaurant whose contracts were loaded already (lists load them in bulk). */
    public subscriptionOf(
        r: RestaurantEntity,
        terms: ContractEntity[],
        now = new Date()
    ): SubscriptionInfo {
        const today = this.today(now);
        const contract = contractSummary(terms, today);
        const state = accessState(r.dueDate, now, r.suspended, contract.state);
        return {
            state,
            status: restaurantStatus(
                { contract: contract.state, dueDate: r.dueDate, suspended: r.suspended },
                now
            ),
            dueDate: r.dueDate,
            graceEndsAt: new Date(r.dueDate.getTime() + GRACE_DAYS * MS_PER_DAY),
            warning: state === AccessState.GRACE,
            reasons: suspensionReasons(r.dueDate, r.suspended, now, contract.state),
            plan: planInForce(terms, today, amendmentOf(r)),
            trial: trialStatus(terms, today),
            contract: { ...contract, voided: voidedLatest(terms) }
        };
    }

    public async updateSettings(
        id: string,
        data: Partial<
            Pick<
                RestaurantEntity,
                | 'description'
                | 'logoUrl'
                | 'coverUrl'
                | 'address'
                | 'phone'
                | 'instagram'
                | 'googleReviewUrl'
                | 'wifiName'
                | 'wifiPassword'
                | 'openingHours'
                | 'guestFeeRefusal'
            >
        > &
            Pick<
                RestaurantEntity,
                'name' | 'managerName' | 'managerContact' | 'serviceFeeBps'
            >,
        actor?: JwtUser
    ): Promise<RestaurantEntity> {
        const r = await this.get(id);
        const fields = changedFields(r, data);
        // Fields not sent stay as they are; only what came in (null included) is saved.
        Object.assign(
            r,
            Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
        );
        const saved = await this.restaurants.save(r);
        if (fields.length && actor)
            await this.audit.record(actor, 'settings_updated', id, { meta: { fields } });
        return saved;
    }

    /**
     * Manual suspension only takes away an access the team still has: a restaurant
     * without a contract in force, or already locked for an overdue payment, has none.
     */
    public async setSuspended(id: string, suspended: boolean): Promise<RestaurantEntity> {
        const r = await this.get(id);
        if (
            suspended &&
            (r.suspended ||
                !['active', 'grace'].includes((await this.subscription(r)).status))
        )
            throw new NothingToSuspendException();
        r.suspended = suspended;
        return this.restaurants.save(r);
    }

    public async overview() {
        const all = await this.restaurants.find();
        const terms = await this.termsOf(all.map((r) => r.id));
        const counts: Record<RestaurantStatus, number> & {
            total: number;
            contractsEnding: number;
        } = {
            total: all.length,
            active: 0,
            grace: 0,
            suspended: 0,
            pending: 0,
            ended: 0,
            contractsEnding: 0
        };
        for (const r of all) {
            const sub = this.subscriptionOf(r, terms.get(r.id) ?? []);
            counts[sub.status]++;
            if (
                sub.contract.daysLeft !== null &&
                sub.contract.daysLeft <= CONTRACT_LIMITS.warnDays
            )
                counts.contractsEnding++;
        }
        return counts;
    }

    /** The public menu and tables exist only while a signed contract is in force. */
    public async assertPublished(r: RestaurantEntity): Promise<void> {
        const terms = (await this.termsOf([r.id])).get(r.id) ?? [];
        if (contractSummary(terms, this.today()).state !== 'active')
            throw new MenuUnavailableException();
    }
}

/** Names of the fields a change really alters, for the activity log (values stay out of it). */
function changedFields(current: object, next: object): string[] {
    const now = current as Record<string, unknown>;
    return Object.entries(next)
        .filter(
            ([k, v]) =>
                v !== undefined &&
                JSON.stringify(v) !==
                    JSON.stringify(
                        now[k] instanceof Date ? (now[k] as Date).toISOString() : now[k]
                    )
        )
        .map(([k]) => k);
}
