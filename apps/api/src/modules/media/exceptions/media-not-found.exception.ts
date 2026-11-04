import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class MediaNotFoundException extends ApiHttpException<ApiErrorCode.MEDIA_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.MEDIA_NOT_FOUND,
            message: 'Image not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
