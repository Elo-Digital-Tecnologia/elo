import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class OrdersInProgressException extends ApiHttpException<ApiErrorCode.ORDERS_IN_PROGRESS> {
    constructor() {
        super({
            code: ApiErrorCode.ORDERS_IN_PROGRESS,
            message: 'There are orders in progress',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
