import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentModule } from '#/modules/documents/document.module.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { StaffModule } from '#/modules/staff/staff.module.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { PaymentEntity } from './entities/payment.entity.js';
import { PlanEntity } from './entities/plan.entity.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([PlanEntity, PaymentEntity, RestaurantEntity]),
        StaffModule,
        DocumentModule
    ],
    controllers: [BillingController],
    providers: [BillingService],
    exports: [BillingService]
})
export class BillingModule {}
