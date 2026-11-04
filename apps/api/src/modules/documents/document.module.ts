import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantModule } from '#/modules/restaurants/restaurant.module.js';
import { DocumentController } from './document.controller.js';
import { DocumentService } from './document.service.js';
import { DocumentEntity } from './entities/document.entity.js';

@Module({
    imports: [TypeOrmModule.forFeature([DocumentEntity]), RestaurantModule],
    controllers: [DocumentController],
    providers: [DocumentService],
    exports: [DocumentService]
})
export class DocumentModule {}
