import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { RestaurantEntity } from './entities/restaurant.entity.js';
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@elo/core/roles/roles';
import { AllowSuspended } from '#/common/decorators/allow-suspended.decorator.js';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { PauseService } from '#/modules/pauses/pause.service.js';
import { RestaurantSettingsResponseDTO } from './dto/restaurant-settings-response.dto.js';
import { SubscriptionResponseDTO } from './dto/subscription-response.dto.js';
import { UpdateSettingsDTO } from './dto/update-settings.dto.js';
import { RestaurantService } from './restaurant.service.js';

/** The restaurant's own view of its subscription. */
@ApiTags('subscription')
@ApiBearerAuth()
@Controller('restaurant')
export class RestaurantSelfController {
    constructor(
        private readonly restaurants: RestaurantService,
        private readonly pauses: PauseService
    ) {}

    @AllowSuspended()
    @Roles(Role.RESTAURANT_ADMIN)
    @Get('subscription')
    public async subscription(@TenantId() restaurantId: string) {
        return SubscriptionResponseDTO.from(
            await this.restaurants.subscription(await this.restaurants.get(restaurantId))
        );
    }

    @Roles(...RestaurantStaff())
    @Get('me')
    public async me(@TenantId() restaurantId: string) {
        return RestaurantSettingsResponseDTO.from(
            await this.profile(await this.restaurants.get(restaurantId))
        );
    }

    @Roles(Role.RESTAURANT_ADMIN)
    @Patch('settings')
    public async settings(
        @TenantId() restaurantId: string,
        @Body() dto: UpdateSettingsDTO,
        @CurrentUser() user: JwtUser
    ) {
        const saved = await this.restaurants.updateSettings(restaurantId, dto, user);
        if (dto.openingHours !== undefined) await this.pauses.announce(restaurantId);
        return RestaurantSettingsResponseDTO.from(await this.profile(saved));
    }

    private async profile(r: RestaurantEntity) {
        return {
            id: r.id,
            slug: r.slug,
            name: r.name,
            managerName: r.managerName,
            managerContact: r.managerContact,
            serviceFeeBps: r.serviceFeeBps,
            guestFeeRefusal: r.guestFeeRefusal,
            ...(await this.restaurants.publicProfile(r)),
            wifiName: r.wifiName,
            wifiPassword: r.wifiPassword,
            openingHours: r.openingHours,
            subscription: await this.restaurants.subscription(r)
        };
    }
}

function RestaurantStaff(): Role[] {
    return [Role.RESTAURANT_ADMIN, Role.MANAGER, Role.WAITER, Role.KITCHEN, Role.CASHIER];
}
