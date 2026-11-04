import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidStatusTransitionException extends ApiHttpException<ApiErrorCode.INVALID_STATUS_TRANSITION> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_STATUS_TRANSITION,
            message: 'Invalid status transition',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
