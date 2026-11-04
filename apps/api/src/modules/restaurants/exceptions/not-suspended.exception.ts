import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NotSuspendedException extends ApiHttpException<ApiErrorCode.NOT_SUSPENDED> {
    constructor() {
        super({
            code: ApiErrorCode.NOT_SUSPENDED,
            message: 'The restaurant is not suspended',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
