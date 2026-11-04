import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import { CategoryEntity } from './entities/category.entity.js';
import { ProductEntity } from './entities/product.entity.js';

@Module({
    imports: [TypeOrmModule.forFeature([CategoryEntity, ProductEntity])],
    controllers: [CatalogController],
    providers: [CatalogService],
    exports: [CatalogService]
})
export class CatalogModule {}
