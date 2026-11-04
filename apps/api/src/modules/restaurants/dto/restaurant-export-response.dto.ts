import type { Role } from '@elo/core/roles/roles';
import type { TableState } from '@elo/core/tables/table-state';
import type { PaymentEntity } from '#/modules/billing/entities/payment.entity.js';
import type { WaiterCallEntity } from '#/modules/calls/entities/waiter-call.entity.js';
import type { CategoryEntity } from '#/modules/catalog/entities/category.entity.js';
import type { ProductEntity } from '#/modules/catalog/entities/product.entity.js';
import type { OrderEntity } from '#/modules/orders/entities/order.entity.js';
import type { ReviewEntity } from '#/modules/reviews/entities/review.entity.js';
import type { RestaurantEntity } from '../entities/restaurant.entity.js';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class RestaurantExportResponseDTO {
    @Expose()
    public exportedAt: string;

    @Expose()
    public restaurant: RestaurantEntity;

    @Expose()
    public staff: Array<{
        id: string;
        restaurantId: string | null;
        username: string;
        name: string;
        displayName: string | null;
        avatarUrl: string | null;
        roles: Role[];
        permissions: string[];
        active: boolean;
        deletedAt: Date | null;
        createdAt: Date;
    }>;

    @Expose()
    public categories: Array<CategoryEntity>;

    @Expose()
    public products: Array<ProductEntity>;

    @Expose()
    public tables: Array<{
        id: string;
        restaurantId: string;
        name: string;
        state: TableState;
        waiterId: string | null;
    }>;

    @Expose()
    public orders: Array<OrderEntity>;

    @Expose()
    public calls: Array<WaiterCallEntity>;

    @Expose()
    public payments: Array<PaymentEntity>;

    @Expose()
    public reviews: Array<ReviewEntity>;

    public static from(source: RestaurantExportResponseDTO): RestaurantExportResponseDTO {
        return plainToInstance(RestaurantExportResponseDTO, source);
    }
}
