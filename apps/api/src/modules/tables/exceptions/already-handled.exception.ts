import type { ApiAlreadyHandledDetail } from '@elo/core/api/api-error-detail';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class AlreadyHandledException extends ApiHttpException<ApiErrorCode.ALREADY_HANDLED> {
    constructor(handled: ApiAlreadyHandledDetail) {
        super({
            code: ApiErrorCode.ALREADY_HANDLED,
            message: 'Someone already handled it',
            details: [handled],
            status: HttpStatus.CONFLICT
        });
    }
}
