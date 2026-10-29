import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushSubscription, Restaurant, StaffUser } from '../database/entities';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription, StaffUser, Restaurant])],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
