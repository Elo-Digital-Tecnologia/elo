import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class TooManyOptionsException extends ApiHttpException<ApiErrorCode.TOO_MANY_OPTIONS> {
    constructor() {
        super({
            code: ApiErrorCode.TOO_MANY_OPTIONS,
            message: 'Too many options',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
