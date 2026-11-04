import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NoActiveSessionException extends ApiHttpException<ApiErrorCode.NO_ACTIVE_SESSION> {
    constructor() {
        super({
            code: ApiErrorCode.NO_ACTIVE_SESSION,
            message: 'The table has no active session',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
