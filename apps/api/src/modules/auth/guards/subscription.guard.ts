import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessState } from '@elo/core/subscription/subscription';
import { ALLOW_SUSPENDED, IS_PUBLIC } from '#/common/decorators/metadata-keys.js';
import { RestaurantService } from '#/modules/restaurants/restaurant.service.js';
import { RestaurantDeletedException } from '../exceptions/restaurant-deleted.exception.js';
import { SubscriptionSuspendedException } from '../exceptions/subscription-suspended.exception.js';

/** Blocks restaurant staff while the subscription is suspended. */
@Injectable()
export class SubscriptionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly restaurants: RestaurantService
    ) {}

    public async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const targets = [ctx.getHandler(), ctx.getClass()];
        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
        if (this.reflector.getAllAndOverride<boolean>(ALLOW_SUSPENDED, targets))
            return true;
        const user: JwtUser = ctx.switchToHttp().getRequest().user;
        if (!user.restaurantId) return true;
        // Elo support may enter a suspended restaurant, but not a deleted one.
        if (user.impersonatedBy) {
            if (await this.restaurants.isDeleted(user.restaurantId))
                throw new RestaurantDeletedException();
            return true;
        }
        const state = await this.restaurants.accessStateOf(user.restaurantId);
        if (state === AccessState.SUSPENDED) {
            // The panel says what to do: pay, wait for the Elo team, or sign a new contract.
            const r = await this.restaurants.get(user.restaurantId).catch(() => null);
            const sub = r ? await this.restaurants.subscription(r) : null;
            throw new SubscriptionSuspendedException({
                status: sub?.status ?? 'suspended',
                reasons: sub?.reasons ?? [],
                contractEndsOn: sub?.contract.endsOn ?? null,
                contractStartsOn: sub?.contract.nextStartsOn ?? null
            });
        }
        return true;
    }
}
