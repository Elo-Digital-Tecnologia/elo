// Refresh Token Strategy — Elo Digital API

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '../../../config/jwt.config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly jwtConfig: JwtConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
      passReqToCallback: true
    });
  }

  async validate(req: any, payload: any) {
    if (!payload.sub || payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Attach refresh token to request for controller use
    const refreshToken = req.body?.refreshToken;
    req.refreshToken = refreshToken;

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      restaurantId: payload.restaurantId,
      permissions: payload.permissions
    };
  }
}