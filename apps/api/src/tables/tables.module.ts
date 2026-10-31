import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiningTable, Restaurant, TableSession } from '../database/entities';
import { PausesModule } from '../pauses/pauses.module';
import { StaffModule } from '../staff/staff.module';
import { AdminTablesController, TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiningTable, TableSession, Restaurant]), StaffModule, PausesModule],
  controllers: [TablesController, AdminTablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
