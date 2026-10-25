// Kitchen Module — Elo Digital API

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from '@elo-digital/database/entities/Order';
import { OrderItem } from '@elo-digital/database/entities/OrderItem';

import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [KitchenController],
  providers: [KitchenService],
  exports: [KitchenService]
})
export class KitchenModule {}