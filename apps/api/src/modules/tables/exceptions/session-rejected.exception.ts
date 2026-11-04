import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SessionRejectedException extends ApiHttpException<ApiErrorCode.SESSION_REJECTED> {
    constructor() {
        super({
            code: ApiErrorCode.SESSION_REJECTED,
            message: 'The waiter rejected the table opening',
            details: [],
            status: HttpStatus.UNAUTHORIZED
        });
    }
}
