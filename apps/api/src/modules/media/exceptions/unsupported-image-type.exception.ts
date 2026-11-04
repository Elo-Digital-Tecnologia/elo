import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class UnsupportedImageTypeException extends ApiHttpException<ApiErrorCode.UNSUPPORTED_IMAGE_TYPE> {
    constructor() {
        super({
            code: ApiErrorCode.UNSUPPORTED_IMAGE_TYPE,
            message: 'Unsupported image type',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
