import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class WrongPasswordException extends ApiHttpException<ApiErrorCode.WRONG_PASSWORD> {
    constructor() {
        super({
            code: ApiErrorCode.WRONG_PASSWORD,
            message: 'Wrong password',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
