import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix('api');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1'
  });

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      },
      errorHttpStatusCode: 422
    })
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Elo Digital API')
    .setDescription('API para gestão de restaurantes e cardápio digital')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('session')
    .addTag('auth', 'Autenticação e autorização')
    .addTag('restaurants', 'Gestão de restaurantes')
    .addTag('users', 'Gestão de usuários')
    .addTag('menu', 'Cardápio e produtos')
    .addTag('tables', 'Mesas e sessões')
    .addTag('orders', 'Pedidos e cozinha')
    .addTag('waiter', 'Garçom e chamados')
    .addTag('billing', 'Contas e pagamentos')
    .addTag('subscriptions', 'Assinaturas e pagamentos')
    .addTag('admin', 'Administração da plataforma')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha'
    }
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();