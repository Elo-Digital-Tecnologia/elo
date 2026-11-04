import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableModule } from '#/modules/tables/table.module.js';
import { ReviewEntity } from './entities/review.entity.js';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([ReviewEntity]), TableModule],
    controllers: [ReviewController],
    providers: [ReviewService],
    exports: [ReviewService]
})
export class ReviewModule {}
