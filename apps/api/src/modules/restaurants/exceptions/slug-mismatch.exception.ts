import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SlugMismatchException extends ApiHttpException<ApiErrorCode.SLUG_MISMATCH> {
    constructor() {
        super({
            code: ApiErrorCode.SLUG_MISMATCH,
            message: 'The confirmation does not match the link',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
