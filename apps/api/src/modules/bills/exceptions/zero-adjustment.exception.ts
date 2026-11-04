import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ZeroAdjustmentException extends ApiHttpException<ApiErrorCode.ZERO_ADJUSTMENT> {
    constructor() {
        super({
            code: ApiErrorCode.ZERO_ADJUSTMENT,
            message: 'The adjustment cannot be zero',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
