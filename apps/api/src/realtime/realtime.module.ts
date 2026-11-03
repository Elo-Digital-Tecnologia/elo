import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableSession } from '../database/entities';
import { PushModule } from '../push/push.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { SessionsModule } from '../sessions/sessions.module';
import { StaffModule } from '../staff/staff.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { TableTicketsService } from './table-tickets.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([TableSession]),
        RestaurantsModule,
        StaffModule,
        SessionsModule,
        PushModule
    ],
    providers: [RealtimeService, RealtimeGateway, TableTicketsService],
    exports: [RealtimeService, TableTicketsService]
})
export class RealtimeModule {}
