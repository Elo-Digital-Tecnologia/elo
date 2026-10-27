import { Module } from '@nestjs/common';
import { CallsModule } from '../calls/calls.module';
import { CatalogModule } from '../catalog/catalog.module';
import { OrdersModule } from '../orders/orders.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { TablesModule } from '../tables/tables.module';
import { PublicController } from './public.controller';
import { TableSessionGuard } from './table-session.guard';

@Module({
  imports: [RestaurantsModule, CatalogModule, TablesModule, OrdersModule, CallsModule],
  controllers: [PublicController],
  providers: [TableSessionGuard],
})
export class PublicModule {}
