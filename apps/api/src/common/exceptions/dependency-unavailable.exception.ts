import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class DependencyUnavailableException extends ApiHttpException {
    constructor() {
        super({
            code: ApiErrorCode.SERVICE_UNAVAILABLE,
            message: 'Service unavailable',
            details: [],
            status: HttpStatus.SERVICE_UNAVAILABLE
        });
    }
}
