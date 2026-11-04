import type { ApiRestaurantClosedDetail } from '@elo/core/api/api-error-detail';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class RestaurantClosedException extends ApiHttpException<ApiErrorCode.RESTAURANT_CLOSED> {
    constructor(closed: ApiRestaurantClosedDetail) {
        super({
            code: ApiErrorCode.RESTAURANT_CLOSED,
            message: 'The restaurant is closed',
            details: [closed],
            status: HttpStatus.CONFLICT
        });
    }
}
