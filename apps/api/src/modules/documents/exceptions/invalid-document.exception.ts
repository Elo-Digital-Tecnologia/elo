import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidDocumentException extends ApiHttpException<ApiErrorCode.INVALID_DOCUMENT> {
    constructor(field: string) {
        super({
            code: ApiErrorCode.INVALID_DOCUMENT,
            message: 'Invalid document',
            details: [{ field }],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
