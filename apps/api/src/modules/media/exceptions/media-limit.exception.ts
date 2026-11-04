import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class MediaLimitException extends ApiHttpException<ApiErrorCode.MEDIA_LIMIT> {
    constructor() {
        super({
            code: ApiErrorCode.MEDIA_LIMIT,
            message: 'The image limit was reached',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
