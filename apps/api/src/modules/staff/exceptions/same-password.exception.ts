import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SamePasswordException extends ApiHttpException<ApiErrorCode.SAME_PASSWORD> {
    constructor() {
        super({
            code: ApiErrorCode.SAME_PASSWORD,
            message: 'The new password must differ from the current one',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
