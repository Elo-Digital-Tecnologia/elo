import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class InvalidRequestException extends ApiHttpException {
    constructor() {
        super({
            code: ApiErrorCode.BAD_REQUEST,
            message: 'Bad request',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
