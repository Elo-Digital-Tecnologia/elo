import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiningTable, StaffUser } from '../database/entities';
import { StaffController, EloStaffController, MeController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffUser, DiningTable])],
  controllers: [StaffController, EloStaffController, MeController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
