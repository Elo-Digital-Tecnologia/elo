import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class RequestTooLargeException extends ApiHttpException {
    constructor() {
        super({
            code: ApiErrorCode.PAYLOAD_TOO_LARGE,
            message: 'Payload too large',
            details: [],
            status: HttpStatus.PAYLOAD_TOO_LARGE
        });
    }
}
