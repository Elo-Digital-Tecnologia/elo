import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class RateLimitExceededException extends ApiHttpException {
    constructor() {
        super({
            code: ApiErrorCode.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            details: [],
            status: HttpStatus.TOO_MANY_REQUESTS
        });
    }
}
