import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '#/modules/catalog/entities/product.entity.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { StaffModule } from '#/modules/staff/staff.module.js';
import { AvatarController } from './avatar.controller.js';
import { MediaEntity } from './entities/media.entity.js';
import { MediaAdminController } from './media-admin.controller.js';
import { MediaPublicController } from './media-public.controller.js';
import { MediaService } from './media.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([MediaEntity, ProductEntity, RestaurantEntity]),
        StaffModule
    ],
    controllers: [MediaAdminController, MediaPublicController, AvatarController],
    providers: [MediaService]
})
export class MediaModule {}
