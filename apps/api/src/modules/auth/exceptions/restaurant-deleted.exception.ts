import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class RestaurantDeletedException extends ApiHttpException<ApiErrorCode.RESTAURANT_DELETED> {
    constructor() {
        super({
            code: ApiErrorCode.RESTAURANT_DELETED,
            message: 'The restaurant was deleted',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
