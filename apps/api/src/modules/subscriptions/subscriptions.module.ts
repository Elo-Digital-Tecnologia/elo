// Subscriptions Module — Elo Digital API

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Subscription } from '@elo-digital/database/entities/Subscription';
import { Payment } from '@elo-digital/database/entities/Payment';
import { Restaurant } from '@elo-digital/database/entities/Restaurant';

import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Payment, Restaurant])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService]
})
export class SubscriptionsModule {}