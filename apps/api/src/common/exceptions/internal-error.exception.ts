import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class InternalErrorException extends ApiHttpException {
    constructor() {
        super({
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Internal server error',
            details: [],
            status: HttpStatus.INTERNAL_SERVER_ERROR
        });
    }
}
