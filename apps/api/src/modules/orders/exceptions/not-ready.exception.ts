import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NotReadyException extends ApiHttpException<ApiErrorCode.NOT_READY> {
    constructor() {
        super({
            code: ApiErrorCode.NOT_READY,
            message: 'The order is not ready',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
