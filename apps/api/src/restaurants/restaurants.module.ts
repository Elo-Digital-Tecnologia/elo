import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan, Restaurant } from '../database/entities';
import { PausesModule } from '../pauses/pauses.module';
import { StaffModule } from '../staff/staff.module';
import { AdminRestaurantsController, RestaurantSelfController } from './restaurants.controller';
import { RestaurantLifecycleService } from './restaurant-lifecycle.service';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Plan]), StaffModule, PausesModule],
  controllers: [AdminRestaurantsController, RestaurantSelfController],
  providers: [RestaurantsService, RestaurantLifecycleService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
