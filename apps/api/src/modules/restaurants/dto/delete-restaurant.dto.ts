import { SLUG_MAX } from '@elo/core/slug/slug';
import { IsString, MaxLength } from 'class-validator';

export class DeleteRestaurantDTO {
    @IsString()
    @MaxLength(SLUG_MAX)
    public confirmSlug: string;
}
