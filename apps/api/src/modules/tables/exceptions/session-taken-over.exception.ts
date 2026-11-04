import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SessionTakenOverException extends ApiHttpException<ApiErrorCode.SESSION_TAKEN_OVER> {
    constructor() {
        super({
            code: ApiErrorCode.SESSION_TAKEN_OVER,
            message: 'The table was opened on another device',
            details: [],
            status: HttpStatus.UNAUTHORIZED
        });
    }
}
