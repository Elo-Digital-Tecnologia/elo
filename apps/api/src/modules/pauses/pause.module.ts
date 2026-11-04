import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { RestaurantPauseEntity } from './entities/restaurant-pause.entity.js';
import { PauseController } from './pause.controller.js';
import { PauseService } from './pause.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([RestaurantPauseEntity, RestaurantEntity])],
    controllers: [PauseController],
    providers: [PauseService],
    exports: [PauseService]
})
export class PauseModule {}
