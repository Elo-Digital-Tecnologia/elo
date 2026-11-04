import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidOwnerException extends ApiHttpException<ApiErrorCode.INVALID_OWNER> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_OWNER,
            message: 'Invalid owner',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
