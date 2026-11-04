import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class UsernameTakenException extends ApiHttpException<ApiErrorCode.USERNAME_TAKEN> {
    constructor(field: string) {
        super({
            code: ApiErrorCode.USERNAME_TAKEN,
            message: 'The username is already taken',
            details: [{ field }],
            status: HttpStatus.CONFLICT
        });
    }
}
