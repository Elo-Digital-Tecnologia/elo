import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidPeriodException extends ApiHttpException<ApiErrorCode.INVALID_PERIOD> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_PERIOD,
            message: 'Invalid period',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
