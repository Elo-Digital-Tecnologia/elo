import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NotAPaymentException extends ApiHttpException<ApiErrorCode.NOT_A_PAYMENT> {
    constructor() {
        super({
            code: ApiErrorCode.NOT_A_PAYMENT,
            message: 'The entry is not a payment',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
