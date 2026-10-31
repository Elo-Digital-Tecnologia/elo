import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant, StaffUser } from '../database/entities';
import { AuthController, SessionController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffUser, Restaurant])],
  controllers: [AuthController, SessionController],
  providers: [AuthService],
})
export class AuthModule {}
