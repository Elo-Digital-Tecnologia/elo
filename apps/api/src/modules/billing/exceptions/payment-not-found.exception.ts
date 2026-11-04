import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class PaymentNotFoundException extends ApiHttpException<ApiErrorCode.PAYMENT_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.PAYMENT_NOT_FOUND,
            message: 'Billing entry not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
