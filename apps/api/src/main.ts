import 'reflect-metadata';

import type { NestExpressApplication } from '@nestjs/platform-express';
import type { EnvConfig } from './config/env.js';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.enableShutdownHooks();
    setupApp(app);

    const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);
    if (configService.getOrThrow('app.docs', { infer: true })) {
        const document = SwaggerModule.createDocument(
            app,
            new DocumentBuilder()
                .setTitle('Elo Digital API')
                .setVersion('0.1')
                .addBearerAuth()
                .build()
        );
        SwaggerModule.setup('docs', app, document);
    }

    await app.listen(configService.getOrThrow('app.port', { infer: true }));
}

void bootstrap();
