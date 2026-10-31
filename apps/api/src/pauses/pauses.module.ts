import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant, RestaurantPause } from '../database/entities';
import { PausesController } from './pauses.controller';
import { PausesService } from './pauses.service';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantPause, Restaurant])],
  controllers: [PausesController],
  providers: [PausesService],
  exports: [PausesService],
})
export class PausesModule {}
