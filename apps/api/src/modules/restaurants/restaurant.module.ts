import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanEntity } from '#/modules/billing/entities/plan.entity.js';
import { ContractEntity } from '#/modules/contracts/entities/contract.entity.js';
import { PauseModule } from '#/modules/pauses/pause.module.js';
import { StaffModule } from '#/modules/staff/staff.module.js';
import { AdminRestaurantController } from './admin-restaurant.controller.js';
import { RestaurantSlugAliasEntity } from './entities/restaurant-slug-alias.entity.js';
import { RestaurantEntity } from './entities/restaurant.entity.js';
import { RestaurantLifecycleService } from './restaurant-lifecycle.service.js';
import { RestaurantSelfController } from './restaurant-self.controller.js';
import { RestaurantService } from './restaurant.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            RestaurantEntity,
            RestaurantSlugAliasEntity,
            PlanEntity,
            ContractEntity
        ]),
        StaffModule,
        PauseModule
    ],
    controllers: [AdminRestaurantController, RestaurantSelfController],
    providers: [RestaurantService, RestaurantLifecycleService],
    exports: [RestaurantService]
})
export class RestaurantModule {}
