import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiningTable, StaffUser } from '../database/entities';
import { SessionsModule } from '../sessions/sessions.module';
import { EloStaffController, MeController, StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
    imports: [TypeOrmModule.forFeature([StaffUser, DiningTable]), SessionsModule],
    controllers: [StaffController, EloStaffController, MeController],
    providers: [StaffService],
    exports: [StaffService]
})
export class StaffModule {}
