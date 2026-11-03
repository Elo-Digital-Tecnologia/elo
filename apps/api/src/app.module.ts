import { Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import {
    InjectThrottlerOptions,
    InjectThrottlerStorage,
    ThrottlerGuard,
    ThrottlerModule,
    ThrottlerModuleOptions,
    ThrottlerStorage
} from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SESSION_RULES } from '@elo/core';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, RolesGuard, SubscriptionGuard } from './auth/guards';
import { BillingModule } from './billing/billing.module';
import { BillsModule } from './bills/bills.module';
import { CallsModule } from './calls/calls.module';
import { CatalogModule } from './catalog/catalog.module';
import { Env, loadEnv } from './config/env';
import { ContractsModule } from './contracts/contracts.module';
import { ENTITIES } from './database/entities';
import { SnakeNamingStrategy } from './database/naming';
import { DocumentsModule } from './documents/documents.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { OrdersModule } from './orders/orders.module';
import { PausesModule } from './pauses/pauses.module';
import { PublicModule } from './public/public.module';
import { TABLE_COOKIE } from './realtime/realtime.gateway';
import { RealtimeModule } from './realtime/realtime.module';
import { ReportsModule } from './reports/reports.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SessionsModule } from './sessions/sessions.module';
import { StaffModule } from './staff/staff.module';
import { TablesModule } from './tables/tables.module';

/**
 * Limite por funcionário (JWT verificado), senão por sessão da mesa, senão por IP.
 * O guard roda antes do JwtAuthGuard, então o token é verificado aqui: um token
 * forjado cai no balde do IP e não consome o limite de outra pessoa.
 */
const UUID = /^[0-9a-f-]{36}$/;

@Injectable()
class SessionOrIpThrottlerGuard extends ThrottlerGuard {
    constructor(
        @InjectThrottlerOptions() options: ThrottlerModuleOptions,
        @InjectThrottlerStorage() storage: ThrottlerStorage,
        reflector: Reflector,
        private readonly jwt: JwtService
    ) {
        super(options, storage, reflector);
    }

    protected async getTracker(req: Record<string, unknown>): Promise<string> {
        const header = (req.headers as Record<string, string | undefined> | undefined)
            ?.authorization;
        if (header?.startsWith('Bearer ')) {
            try {
                const { sub } = this.jwt.verify<{ sub: string }>(header.slice(7));
                if (sub) return `u:${sub}`;
            } catch {
                /* token inválido: segue para os outros critérios */
            }
        }
        // Sign-in and starting a table session never trust the cookie: a made-up value
        // would otherwise open a fresh bucket on every request and lift the limit.
        const path = String(req.url ?? '').split('?')[0];
        if (/\/auth\//.test(path) || /\/public\/[^/]+\/[^/]+\/session$/.test(path))
            return `ip:${req.ip}`;
        const session = (req.cookies as Record<string, string> | undefined)?.[
            TABLE_COOKIE
        ];
        return session && UUID.test(session) ? `s:${session}` : `ip:${req.ip}`;
    }
}

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            // apps/api/.env; the scripts run with the API folder as the working directory.
            envFilePath: ['.env'],
            validate: (raw) => ({ ...raw, ...loadEnv(raw) })
        }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
        JwtModule.registerAsync({
            global: true,
            inject: [ConfigService],
            useFactory: (config: ConfigService<Env, true>) => ({
                secret: config.get('JWT_SECRET', { infer: true }),
                signOptions: { expiresIn: `${SESSION_RULES.accessTokenMinutes}m` }
            })
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService<Env, true>) => ({
                type: 'postgres' as const,
                url: config.get('DATABASE_URL', { infer: true }),
                entities: ENTITIES,
                namingStrategy: new SnakeNamingStrategy(),
                ssl: config.get('DATABASE_SSL', { infer: true })
                    ? { rejectUnauthorized: false }
                    : false,
                // Local apenas: demais ambientes usam migrations versionadas.
                synchronize: false,
                migrationsRun: false
            })
        }),
        HealthModule,
        AuditModule,
        AuthModule,
        SessionsModule,
        StaffModule,
        RestaurantsModule,
        BillingModule,
        DocumentsModule,
        ContractsModule,
        PausesModule,
        CatalogModule,
        MediaModule,
        ReviewsModule,
        TablesModule,
        OrdersModule,
        CallsModule,
        BillsModule,
        ReportsModule,
        RealtimeModule,
        PublicModule
    ],
    providers: [
        { provide: APP_GUARD, useClass: SessionOrIpThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: SubscriptionGuard }
    ]
})
export class AppModule {}
