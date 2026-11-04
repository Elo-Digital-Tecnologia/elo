import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class PeriodTooLongException extends ApiHttpException<ApiErrorCode.PERIOD_TOO_LONG> {
    constructor() {
        super({
            code: ApiErrorCode.PERIOD_TOO_LONG,
            message: 'The period is too long',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
