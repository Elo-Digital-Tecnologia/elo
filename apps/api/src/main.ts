import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { createValidationPipe } from './common/validation';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { corsOrigin } from './config/cors';
import type { Env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(cookieParser());
  app.set('trust proxy', 1);
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalPipes(createValidationPipe());

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Elo Digital API').setVersion('0.1').addBearerAuth().build(),
  );
  SwaggerModule.setup('docs', app, doc);

  await app.listen(config.get('API_PORT', { infer: true }));
}

void bootstrap();
