import type { OpeningHours } from '@elo/core/opening-hours/open-status';
import type { PlanEntity } from '#/modules/billing/entities/plan.entity.js';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class RestaurantResponseDTO {
    @Expose()
    public id: string;

    @Expose()
    public slug: string;

    @Expose()
    public name: string;

    @Expose()
    public managerName: string;

    @Expose()
    public managerContact: string;

    @Expose()
    public dueDate: Date;

    @Expose()
    public initialDueDate: Date;

    @Expose()
    public planId: string | null;

    @Expose()
    public plan: PlanEntity | null;

    @Expose()
    public priceCents: number | null;

    @Expose()
    public cycleMonths: number | null;

    @Expose()
    public planAmendedAt: Date | null;

    @Expose()
    public suspended: boolean;

    @Expose()
    public serviceFeeBps: number;

    @Expose()
    public guestFeeRefusal: boolean;

    @Expose()
    public description: string | null;

    @Expose()
    public logoUrl: string | null;

    @Expose()
    public coverUrl: string | null;

    @Expose()
    public address: string | null;

    @Expose()
    public phone: string | null;

    @Expose()
    public instagram: string | null;

    @Expose()
    public wifiName: string | null;

    @Expose()
    public wifiPassword: string | null;

    @Expose()
    public googleReviewUrl: string | null;

    @Expose()
    public openingHours: OpeningHours | null;

    @Expose()
    public createdAt: Date;

    @Expose()
    public deletedAt: Date | null;

    @Expose()
    public deletedBy: string | null;

    public static from(source: RestaurantResponseDTO): RestaurantResponseDTO {
        return plainToInstance(RestaurantResponseDTO, source);
    }
}
