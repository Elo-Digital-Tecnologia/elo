import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { EnvConfig } from '#/config/env.js';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MS_PER_SECOND } from '@elo/core/time/time-units';
import { SnakeNamingStrategy } from '#/common/database/snake-naming.strategy.js';
import { SessionOrIpThrottlerGuard } from '#/common/guards/session-or-ip-throttler.guard.js';
import { loadConfig } from '#/config/env.js';
import { AuditLogModule } from '#/modules/audit-logs/audit-log.module.js';
import { AuthModule } from '#/modules/auth/auth.module.js';
import { AccessTokenGuard } from '#/modules/auth/guards/access-token.guard.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { SubscriptionGuard } from '#/modules/auth/guards/subscription.guard.js';
import { BillingModule } from '#/modules/billing/billing.module.js';
import { BillModule } from '#/modules/bills/bill.module.js';
import { CallModule } from '#/modules/calls/call.module.js';
import { CatalogModule } from '#/modules/catalog/catalog.module.js';
import { ContractModule } from '#/modules/contracts/contract.module.js';
import { DocumentModule } from '#/modules/documents/document.module.js';
import { HealthModule } from '#/modules/health/health.module.js';
import { MediaModule } from '#/modules/media/media.module.js';
import { OrderModule } from '#/modules/orders/order.module.js';
import { PauseModule } from '#/modules/pauses/pause.module.js';
import { PublicModule } from '#/modules/public/public.module.js';
import { RealtimeModule } from '#/modules/realtime/realtime.module.js';
import { ReportModule } from '#/modules/reports/report.module.js';
import { RestaurantModule } from '#/modules/restaurants/restaurant.module.js';
import { ReviewModule } from '#/modules/reviews/review.module.js';
import { SessionModule } from '#/modules/sessions/session.module.js';
import { StaffModule } from '#/modules/staff/staff.module.js';
import { TableModule } from '#/modules/tables/table.module.js';

@Module({
    imports: [
        // Config
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '../../.env'],
            load: [() => loadConfig()]
        }),
        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService<EnvConfig, true>) => [
                {
                    ttl: configService.getOrThrow('throttle.ttlMs', { infer: true }),
                    limit: configService.getOrThrow('throttle.limit', { infer: true })
                }
            ]
        }),
        JwtModule.registerAsync({
            global: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<EnvConfig, true>) => ({
                secret: configService.getOrThrow('jwt.accessTokenSecret', {
                    infer: true
                }),
                signOptions: {
                    expiresIn: Math.floor(
                        configService.getOrThrow('jwt.accessTokenExpiresInMs', {
                            infer: true
                        }) / MS_PER_SECOND
                    )
                }
            })
        }),

        // Database
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (
                configService: ConfigService<EnvConfig, true>
            ): TypeOrmModuleOptions => {
                const { ssl, ...database } = configService.getOrThrow('database', {
                    infer: true
                });
                return {
                    type: 'postgres',
                    ...database,
                    ssl: ssl ? { rejectUnauthorized: false } : false,
                    autoLoadEntities: true,
                    namingStrategy: new SnakeNamingStrategy(),
                    synchronize: !configService.getOrThrow('app.isProduction', {
                        infer: true
                    }),
                    migrationsRun: false
                };
            }
        }),

        // Application modules
        HealthModule,
        AuditLogModule,
        AuthModule,
        SessionModule,
        StaffModule,
        RestaurantModule,
        BillingModule,
        DocumentModule,
        ContractModule,
        PauseModule,
        CatalogModule,
        MediaModule,
        ReviewModule,
        TableModule,
        OrderModule,
        CallModule,
        BillModule,
        ReportModule,
        RealtimeModule,
        PublicModule
    ],
    providers: [
        { provide: APP_GUARD, useClass: SessionOrIpThrottlerGuard },
        { provide: APP_GUARD, useClass: AccessTokenGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: SubscriptionGuard }
    ]
})
export class AppModule {}
