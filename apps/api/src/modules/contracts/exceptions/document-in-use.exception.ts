import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class DocumentInUseException extends ApiHttpException<ApiErrorCode.DOCUMENT_IN_USE> {
    constructor(field: string) {
        super({
            code: ApiErrorCode.DOCUMENT_IN_USE,
            message: 'The document is in use',
            details: [{ field }],
            status: HttpStatus.CONFLICT
        });
    }
}
