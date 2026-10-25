// Billing Module — Elo Digital API

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Bill } from '@elo-digital/database/entities/Bill';
import { BillItem } from '@elo-digital/database/entities/BillItem';
import { ServiceCharge } from '@elo-digital/database/entities/ServiceCharge';
import { Order } from '@elo-digital/database/entities/Order';

import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Bill, BillItem, ServiceCharge, Order])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService]
})
export class BillingModule {}