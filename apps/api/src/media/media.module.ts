import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media, Product } from '../database/entities';
import { MediaAdminController, MediaPublicController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [TypeOrmModule.forFeature([Media, Product])],
  controllers: [MediaAdminController, MediaPublicController],
  providers: [MediaService],
})
export class MediaModule {}
