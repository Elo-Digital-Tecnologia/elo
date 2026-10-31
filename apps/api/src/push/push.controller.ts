import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsUrl, Matches, MaxLength, ValidateBy, ValidateNested } from 'class-validator';
import { RestaurantStaffRoles } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { CurrentUser, Roles } from '../common/decorators';
import { PushService } from './push.service';

const B64URL = /^[A-Za-z0-9_-]+$/;

export class SubscriptionKeys {
  @IsString() @Matches(B64URL) @MaxLength(120) p256dh: string;
  @IsString() @Matches(B64URL) @MaxLength(60) auth: string;
}

/**
 * The browsers' own push services. The server posts to the endpoint, so any other
 * host (an internal address, a cloud metadata IP) is refused.
 */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

export const isPushEndpoint = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.port && PUSH_HOSTS.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
};

export class SubscribeDto {
  @IsUrl({ protocols: ['https'], require_tld: true })
  @ValidateBy({ name: 'pushEndpoint', validator: { validate: (v: unknown) => typeof v === 'string' && isPushEndpoint(v) } })
  @MaxLength(1000)
  endpoint: string;
  @ValidateNested() @Type(() => SubscriptionKeys) keys: SubscriptionKeys;
}

export class UnsubscribeDto {
  @IsString() @MaxLength(1000) endpoint: string;
}

/** Staff phones register here to get alerts with the panel closed. */
@ApiTags('push')
@ApiBearerAuth()
@Roles(...RestaurantStaffRoles)
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  /** Null when the server has no VAPID keys: the panel then says push is off. */
  @Get('public-key')
  key() {
    return { key: this.push.publicKey() };
  }

  @Post('subscriptions')
  @HttpCode(204)
  subscribe(@CurrentUser() user: JwtUser, @Body() dto: SubscribeDto) {
    // Elo support inside a restaurant panel is not a member of its team.
    if (user.impersonatedBy || !user.restaurantId) throw new ForbiddenException();
    return this.push.subscribe(user.sub, user.restaurantId, dto);
  }

  @Delete('subscriptions')
  @HttpCode(204)
  unsubscribe(@CurrentUser() user: JwtUser, @Body() dto: UnsubscribeDto) {
    return this.push.unsubscribe(user.sub, dto.endpoint);
  }
}
