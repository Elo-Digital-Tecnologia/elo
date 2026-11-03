import 'reflect-metadata';

import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Env } from './config/env';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/validation';
import { corsOrigin } from './config/cors';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    // A new deploy stops the old process: close the database and sockets before it exits.
    app.enableShutdownHooks();
    const config = app.get<ConfigService<Env, true>>(ConfigService);

    app.use(cookieParser());
    app.set('trust proxy', 1);
    app.enableCors({ origin: corsOrigin, credentials: true });
    app.useGlobalPipes(createValidationPipe());

    if (config.get('API_DOCS', { infer: true })) {
        const doc = SwaggerModule.createDocument(
            app,
            new DocumentBuilder()
                .setTitle('Elo Digital API')
                .setVersion('0.1')
                .addBearerAuth()
                .build()
        );
        SwaggerModule.setup('docs', app, doc);
    }

    await app.listen(config.get('API_PORT', { infer: true }));
}

void bootstrap();
