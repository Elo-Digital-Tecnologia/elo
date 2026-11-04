import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ReceiptInUseException extends ApiHttpException<ApiErrorCode.RECEIPT_IN_USE> {
    constructor(field: string) {
        super({
            code: ApiErrorCode.RECEIPT_IN_USE,
            message: 'The receipt is in use',
            details: [{ field }],
            status: HttpStatus.CONFLICT
        });
    }
}
