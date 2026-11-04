import type { Availability } from '@elo/core/opening-hours/open-status';
import type { TableState } from '@elo/core/tables/table-state';
import type { ProductEntity } from '#/modules/catalog/entities/product.entity.js';
import type { OrderEntity } from '#/modules/orders/entities/order.entity.js';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class SessionStateResponseDTO {
    @Expose()
    public readOnly: boolean;

    @Expose()
    public restaurant: {
        wifi: { name: string | null; password: string | null } | null;
        description: string | null;
        logoUrl: string | null;
        coverUrl: string | null;
        address: string | null;
        phone: string | null;
        instagram: string | null;
        googleReviewUrl: string | null;
        availability: Availability;
        name: string;
        slug: string;
        serviceFeeBps: number;
        guestFeeRefusal: boolean;
    };

    @Expose()
    public table: { name: string; state: TableState; waiterName: string | null };

    @Expose()
    public orders: Array<OrderEntity>;

    @Expose()
    public menu: Array<{
        products: Array<ProductEntity>;
        id: string;
        restaurantId: string;
        name: string;
        position: number;
    }>;

    @Expose()
    public realtimeTicket: string;

    public static from(source: SessionStateResponseDTO): SessionStateResponseDTO {
        return plainToInstance(SessionStateResponseDTO, source);
    }
}
