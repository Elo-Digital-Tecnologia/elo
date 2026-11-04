import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ReceiptAlreadyAttachedException extends ApiHttpException<ApiErrorCode.RECEIPT_ALREADY_ATTACHED> {
    constructor(field: string) {
        super({
            code: ApiErrorCode.RECEIPT_ALREADY_ATTACHED,
            message: 'A receipt is already attached',
            details: [{ field }],
            status: HttpStatus.CONFLICT
        });
    }
}
