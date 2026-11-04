import type { NestExpressApplication } from '@nestjs/platform-express';
import type { EnvConfig } from './config/env.js';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { ApiExceptionFilter } from '#/common/filters/api-exception.filter.js';
import { TransformResponseInterceptor } from '#/common/interceptors/transform-response.interceptor.js';
import { ApiValidationPipe } from '#/common/pipes/validation.pipe.js';
import { corsOriginOf } from '#/config/cors.js';
import { HEALTH_ROUTE } from '#/modules/health/health.constants.js';
import { RealtimeIoAdapter } from '#/modules/realtime/adapters/realtime-io.adapter.js';

/** Middlewares, global pipes, interceptors, filters and adapters shared by the server and the e2e tests. */
export function setupApp(app: NestExpressApplication): void {
    const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);
    const corsPolicy = {
        ...configService.getOrThrow('app.cors', { infer: true }),
        isProduction: configService.getOrThrow('app.isProduction', { infer: true })
    };

    // Routes
    app.setGlobalPrefix(configService.getOrThrow('app.prefix', { infer: true }), {
        exclude: [HEALTH_ROUTE]
    });

    // Middlewares
    app.use(cookieParser());
    app.set('trust proxy', 1);
    app.enableCors({
        origin: corsOriginOf(corsPolicy),
        methods: corsPolicy.methods,
        credentials: true
    });

    // Global pipes, interceptors and filters
    app.useGlobalPipes(new ApiValidationPipe());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.useGlobalFilters(new ApiExceptionFilter());

    // Adapters
    app.useWebSocketAdapter(new RealtimeIoAdapter(app, corsPolicy));
}
