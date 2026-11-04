import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SessionExpiredException extends ApiHttpException<ApiErrorCode.SESSION_EXPIRED> {
    constructor() {
        super({
            code: ApiErrorCode.SESSION_EXPIRED,
            message: 'The table session expired',
            details: [],
            status: HttpStatus.UNAUTHORIZED
        });
    }
}
