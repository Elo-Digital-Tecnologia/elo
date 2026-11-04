import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SessionInvalidException extends ApiHttpException<ApiErrorCode.SESSION_INVALID> {
    constructor() {
        super({
            code: ApiErrorCode.SESSION_INVALID,
            message: 'Invalid table session',
            details: [],
            status: HttpStatus.UNAUTHORIZED
        });
    }
}
