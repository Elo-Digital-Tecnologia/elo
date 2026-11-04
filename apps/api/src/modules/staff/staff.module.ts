import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionModule } from '#/modules/sessions/session.module.js';
import { DiningTableEntity } from '#/modules/tables/entities/dining-table.entity.js';
import { EloStaffController } from './elo-staff.controller.js';
import { StaffUserEntity } from './entities/staff-user.entity.js';
import { MeController } from './me.controller.js';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([StaffUserEntity, DiningTableEntity]),
        SessionModule
    ],
    controllers: [StaffController, EloStaffController, MeController],
    providers: [StaffService],
    exports: [StaffService]
})
export class StaffModule {}
