import { Module } from '@nestjs/common';
import { BillsModule } from '../bills/bills.module';
import { CallsModule } from '../calls/calls.module';
import { CatalogModule } from '../catalog/catalog.module';
import { OrdersModule } from '../orders/orders.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { TablesModule } from '../tables/tables.module';
import { PushModule } from '../push/push.module';
import { PublicController } from './public.controller';
import { TableSessionGuard } from './table-session.guard';

@Module({
  imports: [RestaurantsModule, CatalogModule, TablesModule, OrdersModule, CallsModule, BillsModule, ReviewsModule, PushModule],
  controllers: [PublicController],
  providers: [TableSessionGuard],
})
export class PublicModule {}
