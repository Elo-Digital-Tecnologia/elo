import type { PaymentProblem } from '@elo/core/billing/billing';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidPaymentException extends ApiHttpException<ApiErrorCode.INVALID_PAYMENT> {
    constructor(problems: PaymentProblem[]) {
        super({
            code: ApiErrorCode.INVALID_PAYMENT,
            message: 'Invalid payment',
            details: problems.map((code) => ({ code })),
            status: HttpStatus.BAD_REQUEST
        });
    }
}
