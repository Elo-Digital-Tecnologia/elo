import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TooManyAdjustmentsException extends ApiHttpException<ApiErrorCode.TOO_MANY_ADJUSTMENTS> {
    constructor() {
        super({
            code: ApiErrorCode.TOO_MANY_ADJUSTMENTS,
            message: 'Too many adjustments',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
