import { BadRequestException, Body, Controller, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { isSessionScope, sessionCookie, type SessionScope } from '@elo/core';
import { Public } from '../common/decorators';
import type { Env } from '../config/env';
import { AuthService, type SignedIn } from './auth.service';
import { LoginDto, RestaurantLoginParams, SessionScopeDto, SuperadminLoginDto } from './auth.dto';

/** Hands the session to the browser in an httpOnly cookie and answers only the access token. */
function signedIn(res: Response, secure: boolean, { accessToken, session }: SignedIn) {
  res.cookie(sessionCookie(session.scope), session.token, { httpOnly: true, sameSite: 'lax', secure, expires: session.expiresAt, path: '/' });
  return { accessToken };
}

const scopeOf = (dto: SessionScopeDto): SessionScope => {
  if (!isSessionScope(dto.scope)) throw new BadRequestException('invalid_scope');
  return dto.scope;
};

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get secure() {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('restaurants/:slug/login')
  async restaurantLogin(@Param() { slug }: RestaurantLoginParams, @Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return signedIn(res, this.secure, await this.auth.restaurantLogin(slug, dto.username, dto.password, req.headers['user-agent']));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('team/login')
  async teamLogin(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return signedIn(res, this.secure, await this.auth.teamLogin(dto.username, dto.password, req.headers['user-agent']));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('superadmin')
  async superadmin(@Body() dto: SuperadminLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return signedIn(res, this.secure, await this.auth.superadminLogin(dto.key, req.headers['user-agent']));
  }

  /**
   * Trades the session cookie for a fresh access token (new tab, reopened browser,
   * token about to expire). Every device of a restaurant may share one address, so
   * the limit is wider than the sign-in one.
   */
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('session')
  async session(@Body() dto: SessionScopeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // A panel opened on an old link, or a cookie saved under one, renews under the current link.
    const { current, old } = await this.auth.scopesOf(scopeOf(dto));
    const found = [current, ...old].find((s) => req.cookies?.[sessionCookie(s)]);
    const out = signedIn(res, this.secure, await this.auth.renew(current, found ? req.cookies[sessionCookie(found)] : undefined));
    if (found && found !== current) res.clearCookie(sessionCookie(found), { path: '/' });
    return out;
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @HttpCode(204)
  @Post('logout')
  async logout(@Body() dto: SessionScopeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const scope = scopeOf(dto);
    await this.auth.logout(scope, req.cookies?.[sessionCookie(scope)]);
    res.clearCookie(sessionCookie(scope), { path: '/' });
  }
}
