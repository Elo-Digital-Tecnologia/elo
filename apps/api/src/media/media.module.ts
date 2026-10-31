import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media, Product, Restaurant } from '../database/entities';
import { StaffModule } from '../staff/staff.module';
import { AvatarController } from './avatar.controller';
import { MediaAdminController, MediaPublicController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [TypeOrmModule.forFeature([Media, Product, Restaurant]), StaffModule],
  controllers: [MediaAdminController, MediaPublicController, AvatarController],
  providers: [MediaService],
})
export class MediaModule {}
