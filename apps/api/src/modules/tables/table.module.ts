import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PauseModule } from '#/modules/pauses/pause.module.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { StaffModule } from '#/modules/staff/staff.module.js';
import { AdminTableController } from './admin-table.controller.js';
import { DiningTableEntity } from './entities/dining-table.entity.js';
import { TableSessionEntity } from './entities/table-session.entity.js';
import { TableController } from './table.controller.js';
import { TableService } from './table.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            DiningTableEntity,
            TableSessionEntity,
            RestaurantEntity
        ]),
        StaffModule,
        PauseModule
    ],
    controllers: [TableController, AdminTableController],
    providers: [TableService],
    exports: [TableService]
})
export class TableModule {}
