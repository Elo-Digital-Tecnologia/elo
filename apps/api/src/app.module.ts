import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, RolesGuard, SubscriptionGuard } from './auth/guards';
import { BillsModule } from './bills/bills.module';
import { ReportsModule } from './reports/reports.module';
import { CallsModule } from './calls/calls.module';
import { CatalogModule } from './catalog/catalog.module';
import { Env, loadEnv } from './config/env';
import { ENTITIES } from './database/entities';
import { SnakeNamingStrategy } from './database/naming';
import { MediaModule } from './media/media.module';
import { OrdersModule } from './orders/orders.module';
import { PublicModule } from './public/public.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { StaffModule } from './staff/staff.module';
import { TablesModule } from './tables/tables.module';
import { TABLE_COOKIE } from './realtime/realtime.gateway';

/**
 * Limite por funcionário (JWT verificado), senão por sessão da mesa, senão por IP.
 * O guard roda antes do JwtAuthGuard, então o token é verificado aqui: um token
 * forjado cai no balde do IP e não consome o limite de outra pessoa.
 */
@Injectable()
class SessionOrIpThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwt: JwtService,
  ) {
    super(options, storage, reflector);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const header = (req.headers as Record<string, string | undefined> | undefined)?.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const { sub } = this.jwt.verify<{ sub: string }>(header.slice(7));
        if (sub) return `u:${sub}`;
      } catch {
        /* token inválido: segue para os outros critérios */
      }
    }
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
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
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
    MediaModule,
    TablesModule,
    OrdersModule,
    CallsModule,
    BillsModule,
    ReportsModule,
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
