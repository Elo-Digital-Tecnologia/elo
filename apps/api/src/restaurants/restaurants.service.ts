import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessState, accessState, GRACE_DAYS, isReservedSlug, openStatus, type RestaurantProfileView, Role, slugify } from '@elo/core';
import type { Env } from '../config/env';
import type { JwtUser } from '../common/auth-types';
import { AuditLog, Payment, Restaurant } from '../database/entities';
import { StaffService } from '../staff/staff.service';

export interface NewRestaurant {
  name: string;
  slug?: string;
  managerName: string;
  managerContact: string;
  dueDate: Date;
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
}

const DAY_MS = 86_400_000;

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(AuditLog) private readonly audit: Repository<AuditLog>,
    private readonly staff: StaffService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Perfil que qualquer cliente pode ver no cardápio. O Wi-Fi fica de fora. */
  publicProfile(r: Restaurant): RestaurantProfileView {
    return {
      description: r.description,
      logoUrl: r.logoUrl,
      coverUrl: r.coverUrl,
      address: r.address,
      phone: r.phone,
      instagram: r.instagram,
      openStatus: openStatus(r.openingHours, new Date(), this.config.get('REPORT_TZ', { infer: true })),
    };
  }

  /** Token de administrador do restaurante para a equipe Elo; dura 45 min e fica registrado. */
  async accessAs(id: string, actor: JwtUser): Promise<{ accessToken: string; slug: string }> {
    const restaurant = await this.get(id);
    await this.audit.save(this.audit.create({ actor: actor.sub, action: 'restaurant_access', restaurantId: id }));
    const payload: JwtUser = {
      sub: `elo:${actor.sub}`,
      role: Role.RestaurantAdmin,
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
    if (await this.restaurants.findOne({ where: { slug } })) {
      throw new ConflictException('slug_taken');
    }
    const restaurant = await this.restaurants.save(
      this.restaurants.create({
        slug,
        name: data.name,
        managerName: data.managerName,
        managerContact: data.managerContact,
        dueDate: data.dueDate,
        serviceFeeBps: data.serviceFeeBps ?? 1000,
      }),
    );
    await this.staff.create({
      restaurantId: restaurant.id,
      username: data.adminUsername,
      password: data.adminPassword,
      role: Role.RestaurantAdmin,
    });
    return restaurant;
  }

  list(): Promise<Restaurant[]> {
    return this.restaurants.find({ order: { name: 'ASC' } });
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

  async accessStateOf(restaurantId: string): Promise<AccessState> {
    return this.stateOf(await this.get(restaurantId));
  }

  subscriptionOf(r: Restaurant, now = new Date()): SubscriptionInfo {
    const state = accessState(r.dueDate, now, r.suspended);
    return {
      state,
      dueDate: r.dueDate,
      graceEndsAt: new Date(r.dueDate.getTime() + GRACE_DAYS * DAY_MS),
      warning: state === AccessState.Grace,
    };
  }

  async updateSettings(
    id: string,
    data: Partial<Pick<Restaurant, 'description' | 'logoUrl' | 'coverUrl' | 'address' | 'phone' | 'instagram' | 'wifiName' | 'wifiPassword' | 'openingHours'>> &
      Pick<Restaurant, 'name' | 'managerName' | 'managerContact' | 'serviceFeeBps'>,
  ): Promise<Restaurant> {
    const r = await this.get(id);
    // Campos não enviados ficam como estão; só o que veio (inclusive nulo) é gravado.
    Object.assign(r, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
    return this.restaurants.save(r);
  }

  async setSuspended(id: string, suspended: boolean): Promise<Restaurant> {
    const r = await this.get(id);
    r.suspended = suspended;
    return this.restaurants.save(r);
  }

  async recordPayment(
    id: string,
    data: { amountCents: number; paidAt: Date; newDueDate: Date; note?: string },
    recordedBy: string,
  ): Promise<Payment> {
    const r = await this.get(id);
    r.dueDate = data.newDueDate;
    await this.restaurants.save(r);
    return this.payments.save(
      this.payments.create({ restaurantId: id, ...data, note: data.note ?? null, recordedBy }),
    );
  }

  paymentHistory(restaurantId: string): Promise<Payment[]> {
    return this.payments.find({ where: { restaurantId }, order: { paidAt: 'DESC' } });
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
