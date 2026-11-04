import type { SessionScope } from '@elo/core/sessions/session-scope';
import type { Request, Response } from 'express';
import type { EnvConfig } from '#/config/env.js';
import type { SignedIn } from './auth.service.js';
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    Res
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { isSessionScope, sessionCookie } from '@elo/core/sessions/session-scope';
import { RATE_LIMITS } from '#/common/constants.js';
import { Public } from '#/common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { AccessTokenResponseDTO } from './dto/access-token-response.dto.js';
import { LoginDTO } from './dto/login.dto.js';
import { RestaurantLoginParamsDTO } from './dto/restaurant-login-params.dto.js';
import { SessionScopeDTO } from './dto/session-scope.dto.js';
import { SuperadminLoginDTO } from './dto/superadmin-login.dto.js';
import { InvalidScopeException } from './exceptions/invalid-scope.exception.js';

/** Hands the session to the browser in an httpOnly cookie and answers only the access token. */
function signedIn(res: Response, secure: boolean, { accessToken, session }: SignedIn) {
    res.cookie(sessionCookie(session.scope), session.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        expires: session.expiresAt,
        path: '/'
    });
    return { accessToken };
}

const scopeOf = (dto: SessionScopeDTO): SessionScope => {
    if (!isSessionScope(dto.scope)) throw new InvalidScopeException();
    return dto.scope;
};

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
    constructor(
        private readonly auth: AuthService,
        private readonly configService: ConfigService<EnvConfig, true>
    ) {}

    private get secure() {
        return this.configService.getOrThrow('app.isProduction', { infer: true });
    }

    @Throttle(RATE_LIMITS.SIGN_IN)
    @Post('restaurants/:slug/login')
    public async restaurantLogin(
        @Param() { slug }: RestaurantLoginParamsDTO,
        @Body() dto: LoginDTO,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        return AccessTokenResponseDTO.from(
            signedIn(
                res,
                this.secure,
                await this.auth.restaurantLogin(
                    slug,
                    dto.username,
                    dto.password,
                    req.headers['user-agent']
                )
            )
        );
    }

    @Throttle(RATE_LIMITS.SIGN_IN)
    @Post('team/login')
    public async teamLogin(
        @Body() dto: LoginDTO,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        return AccessTokenResponseDTO.from(
            signedIn(
                res,
                this.secure,
                await this.auth.teamLogin(
                    dto.username,
                    dto.password,
                    req.headers['user-agent']
                )
            )
        );
    }

    @Throttle(RATE_LIMITS.SIGN_IN)
    @Post('superadmin')
    public async superadmin(
        @Body() dto: SuperadminLoginDTO,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        return AccessTokenResponseDTO.from(
            signedIn(
                res,
                this.secure,
                await this.auth.superadminLogin(dto.key, req.headers['user-agent'])
            )
        );
    }

    /**
     * Trades the session cookie for a fresh access token (new tab, reopened browser,
     * token about to expire). Every device of a restaurant may share one address, so
     * the limit is wider than the sign-in one.
     */
    @Throttle(RATE_LIMITS.SESSION_RENEWAL)
    @Post('session')
    public async session(
        @Body() dto: SessionScopeDTO,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        // A panel opened on an old link, or a cookie saved under one, renews under the current link.
        const { current, old } = await this.auth.scopesOf(scopeOf(dto));
        const found = [current, ...old].find((s) => req.cookies?.[sessionCookie(s)]);
        const out = signedIn(
            res,
            this.secure,
            await this.auth.renew(
                current,
                found ? req.cookies[sessionCookie(found)] : undefined
            )
        );
        if (found && found !== current)
            res.clearCookie(sessionCookie(found), { path: '/' });
        return AccessTokenResponseDTO.from(out);
    }

    @Throttle(RATE_LIMITS.SESSION_RENEWAL)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Post('logout')
    public async logout(
        @Body() dto: SessionScopeDTO,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        const scope = scopeOf(dto);
        await this.auth.logout(scope, req.cookies?.[sessionCookie(scope)]);
        res.clearCookie(sessionCookie(scope), { path: '/' });
    }
}
