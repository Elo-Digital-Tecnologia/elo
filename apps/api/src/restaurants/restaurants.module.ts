import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract, Plan, Restaurant } from '../database/entities';
import { PausesModule } from '../pauses/pauses.module';
import { StaffModule } from '../staff/staff.module';
import { RestaurantLifecycleService } from './restaurant-lifecycle.service';
import {
    AdminRestaurantsController,
    RestaurantSelfController
} from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Restaurant, Plan, Contract]),
        StaffModule,
        PausesModule
    ],
    controllers: [AdminRestaurantsController, RestaurantSelfController],
    providers: [RestaurantsService, RestaurantLifecycleService],
    exports: [RestaurantsService]
})
export class RestaurantsModule {}
