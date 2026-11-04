import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ProductNotFoundException extends ApiHttpException<ApiErrorCode.PRODUCT_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.PRODUCT_NOT_FOUND,
            message: 'Product not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
