import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, RolesGuard, SubscriptionGuard } from './auth/guards';
import { CallsModule } from './calls/calls.module';
import { CatalogModule } from './catalog/catalog.module';
import { Env, loadEnv } from './config/env';
import { ENTITIES } from './database/entities';
import { SnakeNamingStrategy } from './database/naming';
import { OrdersModule } from './orders/orders.module';
import { PublicModule } from './public/public.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { StaffModule } from './staff/staff.module';
import { TablesModule } from './tables/tables.module';
import { TABLE_COOKIE } from './realtime/realtime.gateway';

/** Limite por sessão da mesa quando houver cookie; senão por IP. */
@Injectable()
class SessionOrIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const session = (req.cookies as Record<string, string> | undefined)?.[TABLE_COOKIE];
    return session ? `s:${session}` : `ip:${req.ip}`;
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // O .env fica na raiz do monorepo; o dev roda com cwd em apps/api.
      envFilePath: ['.env', '../../.env'],
      validate: (raw) => ({ ...raw, ...loadEnv(raw) }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: '12h' },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        type: 'postgres' as const,
        url: config.get('DATABASE_URL', { infer: true }),
        entities: ENTITIES,
        namingStrategy: new SnakeNamingStrategy(),
        // Local apenas: demais ambientes usam migrations versionadas.
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    AuthModule,
    StaffModule,
    RestaurantsModule,
    CatalogModule,
    TablesModule,
    OrdersModule,
    CallsModule,
    RealtimeModule,
    PublicModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SessionOrIpThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
  ],
})
export class AppModule {}
