import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidScopeException extends ApiHttpException<ApiErrorCode.INVALID_SCOPE> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_SCOPE,
            message: 'Invalid session scope',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
