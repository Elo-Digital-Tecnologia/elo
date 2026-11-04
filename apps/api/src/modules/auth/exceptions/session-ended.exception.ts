import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SessionEndedException extends ApiHttpException<ApiErrorCode.SESSION_ENDED> {
    constructor() {
        super({
            code: ApiErrorCode.SESSION_ENDED,
            message: 'The session has ended',
            details: [],
            status: HttpStatus.UNAUTHORIZED
        });
    }
}
