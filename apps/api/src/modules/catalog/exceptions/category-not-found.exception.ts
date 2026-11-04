import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class CategoryNotFoundException extends ApiHttpException<ApiErrorCode.CATEGORY_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.CATEGORY_NOT_FOUND,
            message: 'Category not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
