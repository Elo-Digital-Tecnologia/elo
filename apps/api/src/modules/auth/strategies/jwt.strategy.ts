// JWT Strategy — Elo Digital API

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '../../../config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly jwtConfig: JwtConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromCookie('session')
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }

    // Return user object that will be attached to request.user
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      restaurantId: payload.restaurantId,
      permissions: payload.permissions
    };
  }
}