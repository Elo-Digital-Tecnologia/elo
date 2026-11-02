import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant, StaffUser } from '../database/entities';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffUser, Restaurant]), SessionsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
