// Admin Module — Elo Digital API

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@elo-digital/database/entities/User';
import { Restaurant } from '@elo-digital/database/entities/Restaurant';
import { Subscription } from '@elo-digital/database/entities/Subscription';

import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Restaurant, Subscription])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService]
})
export class AdminModule {}