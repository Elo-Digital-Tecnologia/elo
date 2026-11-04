import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ProductUnavailableException extends ApiHttpException<ApiErrorCode.PRODUCT_UNAVAILABLE> {
    constructor() {
        super({
            code: ApiErrorCode.PRODUCT_UNAVAILABLE,
            message: 'The product is unavailable',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
