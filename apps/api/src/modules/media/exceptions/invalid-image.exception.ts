import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidImageException extends ApiHttpException<ApiErrorCode.INVALID_IMAGE> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_IMAGE,
            message: 'Invalid image',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
