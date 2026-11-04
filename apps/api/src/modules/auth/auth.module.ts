import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { SessionModule } from '#/modules/sessions/session.module.js';
import { StaffUserEntity } from '#/modules/staff/entities/staff-user.entity.js';
import { StaffModule } from '#/modules/staff/staff.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AccessTokenStrategy } from './strategies/access-token.strategy.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([StaffUserEntity, RestaurantEntity]),
        PassportModule,
        SessionModule,
        StaffModule
    ],
    controllers: [AuthController],
    providers: [AuthService, AccessTokenStrategy]
})
export class AuthModule {}
