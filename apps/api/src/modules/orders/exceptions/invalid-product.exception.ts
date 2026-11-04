import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidProductException extends ApiHttpException<ApiErrorCode.INVALID_PRODUCT> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_PRODUCT,
            message: 'Invalid product',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
