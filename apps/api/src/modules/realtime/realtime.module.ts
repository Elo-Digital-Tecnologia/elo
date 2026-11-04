import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushModule } from '#/modules/push/push.module.js';
import { RestaurantModule } from '#/modules/restaurants/restaurant.module.js';
import { SessionModule } from '#/modules/sessions/session.module.js';
import { StaffModule } from '#/modules/staff/staff.module.js';
import { TableSessionEntity } from '#/modules/tables/entities/table-session.entity.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';
import { TableTicketService } from './table-ticket.service.js';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([TableSessionEntity]),
        RestaurantModule,
        StaffModule,
        SessionModule,
        PushModule
    ],
    providers: [RealtimeService, RealtimeGateway, TableTicketService],
    exports: [RealtimeService, TableTicketService]
})
export class RealtimeModule {}
