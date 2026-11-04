import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class CategoryNotEmptyException extends ApiHttpException<ApiErrorCode.CATEGORY_NOT_EMPTY> {
    constructor() {
        super({
            code: ApiErrorCode.CATEGORY_NOT_EMPTY,
            message: 'The category still has products',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
