import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, NoImpersonation, Public } from '../common/decorators';
import type { JwtUser } from '../common/auth-types';
import { AuthService } from './auth.service';
import { LoginDto, RestaurantLoginParams, SuperadminLoginDto } from './auth.dto';

@ApiTags('auth')
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('restaurants/:slug/login')
  restaurantLogin(@Param() { slug }: RestaurantLoginParams, @Body() dto: LoginDto) {
    return this.auth.restaurantLogin(slug, dto.username, dto.password);
  }

  @Post('team/login')
  teamLogin(@Body() dto: LoginDto) {
    return this.auth.teamLogin(dto.username, dto.password);
  }

  @Post('superadmin')
  superadmin(@Body() dto: SuperadminLoginDto) {
    return this.auth.superadminLogin(dto.key);
  }
}

/** Signed-in routes of the auth area. */
@ApiTags('auth')
@Controller('auth')
export class SessionController {
  constructor(private readonly auth: AuthService) {}

  @NoImpersonation()
  @Post('refresh')
  refresh(@CurrentUser() user: JwtUser) {
    return this.auth.refresh(user);
  }
}
