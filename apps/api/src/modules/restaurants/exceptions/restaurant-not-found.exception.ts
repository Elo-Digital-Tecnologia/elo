import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class RestaurantNotFoundException extends ApiHttpException<ApiErrorCode.RESTAURANT_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.RESTAURANT_NOT_FOUND,
            message: 'Restaurant not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
