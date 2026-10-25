// Auth Module — Elo Digital API

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@elo-digital/database/entities/User';
import { Restaurant } from '@elo-digital/database/entities/Restaurant';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { TableSessionStrategy } from './strategies/table-session.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Restaurant]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({})
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    TableSessionStrategy
  ],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}