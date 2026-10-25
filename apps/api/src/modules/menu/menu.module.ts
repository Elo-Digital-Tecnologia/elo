// Menu Module — Elo Digital API

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Category } from '@elo-digital/database/entities/Category';
import { Product } from '@elo-digital/database/entities/Product';
import { ProductOption } from '@elo-digital/database/entities/ProductOption';
import { ProductOptionChoice } from '@elo-digital/database/entities/ProductOptionChoice';
import { ProductImage } from '@elo-digital/database/entities/ProductImage';

import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Product, ProductOption, ProductOptionChoice, ProductImage])
  ],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService]
})
export class MenuModule {}