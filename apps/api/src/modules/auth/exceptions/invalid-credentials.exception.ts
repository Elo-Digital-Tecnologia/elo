import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidCredentialsException extends ApiHttpException<ApiErrorCode.INVALID_CREDENTIALS> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_CREDENTIALS,
            message: 'Invalid credentials',
            details: [],
            status: HttpStatus.UNAUTHORIZED
        });
    }
}
