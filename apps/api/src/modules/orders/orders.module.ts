// Orders Module — Elo Digital API

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from '@elo-digital/database/entities/Order';
import { OrderItem } from '@elo-digital/database/entities/OrderItem';
import { OrderStatusHistory } from '@elo-digital/database/entities/OrderStatusHistory';
import { Table } from '@elo-digital/database/entities/Table';
import { TableSession } from '@elo-digital/database/entities/TableSession';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory, Table, TableSession])],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}