import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class PauseNotFoundException extends ApiHttpException<ApiErrorCode.PAUSE_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.PAUSE_NOT_FOUND,
            message: 'Pause not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
