import { Module } from '@nestjs/common';
import { BillModule } from '#/modules/bills/bill.module.js';
import { CallModule } from '#/modules/calls/call.module.js';
import { CatalogModule } from '#/modules/catalog/catalog.module.js';
import { OrderModule } from '#/modules/orders/order.module.js';
import { PushModule } from '#/modules/push/push.module.js';
import { RestaurantModule } from '#/modules/restaurants/restaurant.module.js';
import { ReviewModule } from '#/modules/reviews/review.module.js';
import { TableModule } from '#/modules/tables/table.module.js';
import { TableSessionGuard } from './guards/table-session.guard.js';
import { PublicController } from './public.controller.js';

@Module({
    imports: [
        RestaurantModule,
        CatalogModule,
        TableModule,
        OrderModule,
        CallModule,
        BillModule,
        ReviewModule,
        PushModule
    ],
    controllers: [PublicController],
    providers: [TableSessionGuard]
})
export class PublicModule {}
