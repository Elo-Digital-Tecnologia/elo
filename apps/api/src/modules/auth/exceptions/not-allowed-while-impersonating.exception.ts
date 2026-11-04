import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class NotAllowedWhileImpersonatingException extends ApiHttpException<ApiErrorCode.NOT_ALLOWED_WHILE_IMPERSONATING> {
    constructor() {
        super({
            code: ApiErrorCode.NOT_ALLOWED_WHILE_IMPERSONATING,
            message: 'Not allowed while acting inside a restaurant',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
