import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, Restaurant } from '../database/entities';
import { StaffModule } from '../staff/staff.module';
import { AdminRestaurantsController, RestaurantSelfController } from './restaurants.controller';
import { RestaurantLifecycleService } from './restaurant-lifecycle.service';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Payment]), StaffModule],
  controllers: [AdminRestaurantsController, RestaurantSelfController],
  providers: [RestaurantsService, RestaurantLifecycleService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
