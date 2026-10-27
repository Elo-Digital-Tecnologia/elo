import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableSession } from '../database/entities';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([TableSession]), RestaurantsModule],
  providers: [RealtimeService, RealtimeGateway],
  exports: [RealtimeService],
})
export class RealtimeModule {}
