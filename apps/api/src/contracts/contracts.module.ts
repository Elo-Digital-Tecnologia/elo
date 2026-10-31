import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract, Payment, Restaurant } from '../database/entities';
import { DocumentsModule } from '../documents/documents.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, Restaurant, Payment]), DocumentsModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
