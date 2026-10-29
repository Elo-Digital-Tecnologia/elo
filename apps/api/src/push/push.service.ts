import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ALERTS, alertOf, alertsRole } from '@elo/core';
import type { Env } from '../config/env';
import { PushSubscription, Restaurant, StaffUser } from '../database/entities';
import { sendPush, type VapidKeys } from './web-push';

export interface NewSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Sends the same alerts the open panel shows to the staff phones that
 * subscribed, so a locked phone still hears about a call or an order.
 */
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);
  private readonly keys: VapidKeys | null;

  constructor(
    @InjectRepository(PushSubscription) private readonly subs: Repository<PushSubscription>,
    @InjectRepository(StaffUser) private readonly users: Repository<StaffUser>,
    @InjectRepository(Restaurant) private readonly restaurants: Repository<Restaurant>,
    config: ConfigService<Env, true>,
  ) {
    const publicKey = config.get('VAPID_PUBLIC_KEY', { infer: true });
    const privateKey = config.get('VAPID_PRIVATE_KEY', { infer: true });
    this.keys = publicKey && privateKey ? { publicKey, privateKey, subject: config.get('VAPID_SUBJECT', { infer: true }) } : null;
  }

  publicKey(): string | null {
    return this.keys?.publicKey ?? null;
  }

  async subscribe(staffId: string, restaurantId: string, sub: NewSubscription): Promise<void> {
    await this.subs.upsert({ staffId, restaurantId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, ['endpoint']);
  }

  async unsubscribe(staffId: string, endpoint: string): Promise<void> {
    await this.subs.delete({ staffId, endpoint });
  }

  /** Called for every realtime event; only alerts reach phones. Never throws. */
  dispatch(event: string, restaurantId: string, payload: unknown): void {
    if (!this.keys) return;
    const alert = alertOf(event, payload);
    if (!alert) return;
    void this.deliver(restaurantId, alert).catch((e) => this.log.warn(`Push failed: ${(e as Error).message}`));
  }

  private async deliver(restaurantId: string, alert: NonNullable<ReturnType<typeof alertOf>>) {
    const subs = await this.subs.find({ where: { restaurantId } });
    if (!subs.length) return;
    const staff = await this.users.find({
      where: { id: In([...new Set(subs.map((s) => s.staffId))]), active: true, deletedAt: IsNull() },
      select: { id: true, roles: true },
    });
    const allowed = new Set(staff.filter((u) => alertsRole(alert.kind, u.roles)).map((u) => u.id));
    const targets = subs.filter((s) => allowed.has(s.staffId));
    if (!targets.length) return;
    const restaurant = await this.restaurants.findOne({ where: { id: restaurantId }, select: { id: true, slug: true } });
    if (!restaurant) return;
    const spec = ALERTS[alert.kind];
    const message = { title: spec.title(alert.table), body: spec.body, tag: alert.tag, url: `/r/${restaurant.slug}${spec.path}` };
    await Promise.all(
      targets.map(async (s) => {
        const status = await sendPush(s, message, this.keys!).catch(() => 0);
        if (status === 404 || status === 410) await this.subs.delete({ id: s.id });
      }),
    );
  }
}
