import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffUser } from '../database/entities';
import { StaffController, EloStaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffUser])],
  controllers: [StaffController, EloStaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
