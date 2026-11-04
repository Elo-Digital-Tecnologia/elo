import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from '#/modules/orders/order.module.js';
import { RestaurantModule } from '#/modules/restaurants/restaurant.module.js';
import { TableSessionEntity } from '#/modules/tables/entities/table-session.entity.js';
import { TableModule } from '#/modules/tables/table.module.js';
import { BillController } from './bill.controller.js';
import { BillService } from './bill.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([TableSessionEntity]),
        TableModule,
        OrderModule,
        RestaurantModule
    ],
    controllers: [BillController],
    providers: [BillService],
    exports: [BillService]
})
export class BillModule {}
