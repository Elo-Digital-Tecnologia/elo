import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '#/modules/catalog/catalog.module.js';
import { StaffModule } from '#/modules/staff/staff.module.js';
import { TableModule } from '#/modules/tables/table.module.js';
import { OrderEntity } from './entities/order.entity.js';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([OrderEntity]),
        CatalogModule,
        TableModule,
        StaffModule
    ],
    controllers: [OrderController],
    providers: [OrderService],
    exports: [OrderService]
})
export class OrderModule {}
