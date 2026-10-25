// Waiter Module — Elo Digital API

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CallWaiter } from '@elo-digital/database/entities/CallWaiter';
import { Order } from '@elo-digital/database/entities/Order';

import { WaiterService } from './waiter.service';
import { WaiterController } from './waiter.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CallWaiter, Order])],
  controllers: [WaiterController],
  providers: [WaiterService],
  exports: [WaiterService]
})
export class WaiterModule {}