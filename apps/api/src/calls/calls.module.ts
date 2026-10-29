import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaiterCall } from '../database/entities';
import { StaffModule } from '../staff/staff.module';
import { TablesModule } from '../tables/tables.module';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';

@Module({
  imports: [TypeOrmModule.forFeature([WaiterCall]), TablesModule, StaffModule],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
