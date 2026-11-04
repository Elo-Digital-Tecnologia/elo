import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidCategoryException extends ApiHttpException<ApiErrorCode.INVALID_CATEGORY> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_CATEGORY,
            message: 'Invalid category',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
