import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidTableException extends ApiHttpException<ApiErrorCode.INVALID_TABLE> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_TABLE,
            message: 'Invalid table',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
