import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { StaffUserEntity } from '#/modules/staff/entities/staff-user.entity.js';
import { DiningTableEntity } from '#/modules/tables/entities/dining-table.entity.js';
import { TableSessionEntity } from '#/modules/tables/entities/table-session.entity.js';
import { GuestPushSubscriptionEntity } from './entities/guest-push-subscription.entity.js';
import { PushSubscriptionEntity } from './entities/push-subscription.entity.js';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PushSubscriptionEntity,
            StaffUserEntity,
            RestaurantEntity,
            GuestPushSubscriptionEntity,
            DiningTableEntity,
            TableSessionEntity
        ])
    ],
    controllers: [PushController],
    providers: [PushService],
    exports: [PushService]
})
export class PushModule {}
