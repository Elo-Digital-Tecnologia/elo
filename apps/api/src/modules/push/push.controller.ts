import type { JwtUser } from '#/common/types/jwt-user.type.js';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Post
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantStaffRoles } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { AccessDeniedException } from '#/common/exceptions/access-denied.exception.js';
import { PushKeyResponseDTO } from './dto/push-key-response.dto.js';
import { SubscribeDTO } from './dto/subscribe.dto.js';
import { UnsubscribeDTO } from './dto/unsubscribe.dto.js';
import { PushService } from './push.service.js';

/** Staff phones register here to get alerts with the panel closed. */
@ApiTags('push')
@ApiBearerAuth()
@Roles(...RestaurantStaffRoles)
@Controller('push')
export class PushController {
    constructor(private readonly push: PushService) {}

    /** Null when the server has no VAPID keys: the panel then says push is off. */
    @Get('public-key')
    public key() {
        return PushKeyResponseDTO.from({ key: this.push.publicKey() });
    }

    @Post('subscriptions')
    @HttpCode(HttpStatus.NO_CONTENT)
    public subscribe(@CurrentUser() user: JwtUser, @Body() dto: SubscribeDTO) {
        // Elo support inside a restaurant panel is not a member of its team.
        if (user.impersonatedBy || !user.restaurantId) throw new AccessDeniedException();
        return this.push.subscribe(user.sub, user.restaurantId, dto);
    }

    @Delete('subscriptions')
    @HttpCode(HttpStatus.NO_CONTENT)
    public unsubscribe(@CurrentUser() user: JwtUser, @Body() dto: UnsubscribeDTO) {
        if (user.impersonatedBy) return;
        return this.push.unsubscribe(user.sub, dto.endpoint);
    }
}
