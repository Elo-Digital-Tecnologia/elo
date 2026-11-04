import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ImageInUseException extends ApiHttpException<ApiErrorCode.IMAGE_IN_USE> {
    constructor() {
        super({
            code: ApiErrorCode.IMAGE_IN_USE,
            message: 'The image is in use',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
