import type { RestaurantSettingsView } from '@elo/core/api/views/restaurant.view';
import type { Availability, OpeningHours } from '@elo/core/opening-hours/open-status';
import type { SubscriptionInfo } from '../restaurant.service.js';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class RestaurantSettingsResponseDTO implements RestaurantSettingsView {
    @Expose()
    public wifiName: string | null;

    @Expose()
    public wifiPassword: string | null;

    @Expose()
    public openingHours: OpeningHours | null;

    @Expose()
    public subscription: SubscriptionInfo;

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
    public googleReviewUrl: string | null;

    @Expose()
    public availability: Availability;

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
    public serviceFeeBps: number;

    @Expose()
    public guestFeeRefusal: boolean;

    public static from(
        source: RestaurantSettingsResponseDTO
    ): RestaurantSettingsResponseDTO {
        return plainToInstance(RestaurantSettingsResponseDTO, source);
    }
}
