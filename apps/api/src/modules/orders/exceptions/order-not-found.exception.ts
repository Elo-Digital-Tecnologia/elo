import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class OrderNotFoundException extends ApiHttpException<ApiErrorCode.ORDER_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.ORDER_NOT_FOUND,
            message: 'Order not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
