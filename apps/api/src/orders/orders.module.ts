import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../database/entities';
import { CatalogModule } from '../catalog/catalog.module';
import { StaffModule } from '../staff/staff.module';
import { TablesModule } from '../tables/tables.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), CatalogModule, TablesModule, StaffModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
