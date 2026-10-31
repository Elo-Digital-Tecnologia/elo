import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiningTable, GuestPushSubscription, PushSubscription, Restaurant, StaffUser, TableSession } from '../database/entities';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription, StaffUser, Restaurant, GuestPushSubscription, DiningTable, TableSession])],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
