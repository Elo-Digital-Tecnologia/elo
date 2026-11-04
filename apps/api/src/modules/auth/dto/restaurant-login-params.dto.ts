import { SLUG_MAX, SLUG_PATTERN } from '@elo/core/slug/slug';
import { Matches, MaxLength } from 'class-validator';

export class RestaurantLoginParamsDTO {
    @Matches(SLUG_PATTERN)
    @MaxLength(SLUG_MAX)
    public slug: string;
}
