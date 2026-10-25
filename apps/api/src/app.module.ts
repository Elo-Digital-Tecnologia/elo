import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AppConfig } from './config/app.config';
import { DatabaseConfig } from './config/database.config';
import { JwtConfig } from './config/jwt.config';
import { RedisConfig } from './config/redis.config';
import { ThrottlerConfig } from './config/throttler.config';

import { AuthModule } from './modules/auth/auth.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { UsersModule } from './modules/users/users.module';
import { MenuModule } from './modules/menu/menu.module';
import { TablesModule } from './modules/tables/tables.module';
import { OrdersModule } from './modules/orders/orders.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { WaiterModule } from './modules/waiter/waiter.module';
import { BillingModule } from './modules/billing/billing.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AdminModule } from './modules/admin/admin.module';

import { WebsocketModule } from './websockets/websocket.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, DatabaseConfig, JwtConfig, RedisConfig, ThrottlerConfig],
      envFilePath: ['.env.local', '.env']
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      useClass: ThrottlerConfig
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig
    }),

    // JWT
    JwtModule.registerAsync({
      global: true,
      useClass: JwtConfig
    }),

    // Feature Modules
    AuthModule,
    RestaurantsModule,
    UsersModule,
    MenuModule,
    TablesModule,
    OrdersModule,
    KitchenModule,
    WaiterModule,
    BillingModule,
    SubscriptionsModule,
    AdminModule,

    // WebSockets
    WebsocketModule
  ]
})
export class AppModule {}