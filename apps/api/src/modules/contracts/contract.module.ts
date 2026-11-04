import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from '#/modules/billing/entities/payment.entity.js';
import { DocumentModule } from '#/modules/documents/document.module.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { ContractController } from './contract.controller.js';
import { ContractService } from './contract.service.js';
import { ContractEntity } from './entities/contract.entity.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([ContractEntity, RestaurantEntity, PaymentEntity]),
        DocumentModule
    ],
    controllers: [ContractController],
    providers: [ContractService]
})
export class ContractModule {}
