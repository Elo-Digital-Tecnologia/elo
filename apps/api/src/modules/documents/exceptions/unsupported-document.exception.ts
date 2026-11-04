import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class UnsupportedDocumentException extends ApiHttpException<ApiErrorCode.UNSUPPORTED_DOCUMENT> {
    constructor() {
        super({
            code: ApiErrorCode.UNSUPPORTED_DOCUMENT,
            message: 'Unsupported document type',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
