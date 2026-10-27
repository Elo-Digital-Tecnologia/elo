import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaiterCall } from '../database/entities';
import { TablesModule } from '../tables/tables.module';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';

@Module({
  imports: [TypeOrmModule.forFeature([WaiterCall]), TablesModule],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
