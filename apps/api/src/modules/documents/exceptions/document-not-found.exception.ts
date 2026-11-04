import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class DocumentNotFoundException extends ApiHttpException<ApiErrorCode.DOCUMENT_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.DOCUMENT_NOT_FOUND,
            message: 'Document not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
