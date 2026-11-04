import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidOrderException extends ApiHttpException<ApiErrorCode.INVALID_ORDER> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_ORDER,
            message: 'Invalid sort order',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
