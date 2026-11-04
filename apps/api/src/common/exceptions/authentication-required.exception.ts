import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class AuthenticationRequiredException extends ApiHttpException {
    constructor() {
        super({
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Unauthorized',
            details: [],
            status: HttpStatus.UNAUTHORIZED
        });
    }
}
