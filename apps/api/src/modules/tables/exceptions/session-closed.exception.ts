import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SessionClosedException extends ApiHttpException<ApiErrorCode.SESSION_CLOSED> {
    constructor() {
        super({
            code: ApiErrorCode.SESSION_CLOSED,
            message: 'The table was closed',
            details: [],
            status: HttpStatus.UNAUTHORIZED
        });
    }
}
