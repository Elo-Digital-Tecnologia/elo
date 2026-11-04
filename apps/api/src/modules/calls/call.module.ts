import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffModule } from '#/modules/staff/staff.module.js';
import { TableModule } from '#/modules/tables/table.module.js';
import { CallController } from './call.controller.js';
import { CallService } from './call.service.js';
import { WaiterCallEntity } from './entities/waiter-call.entity.js';

@Module({
    imports: [TypeOrmModule.forFeature([WaiterCallEntity]), TableModule, StaffModule],
    controllers: [CallController],
    providers: [CallService],
    exports: [CallService]
})
export class CallModule {}
