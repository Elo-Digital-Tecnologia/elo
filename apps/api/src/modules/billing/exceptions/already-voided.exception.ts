import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class AlreadyVoidedException extends ApiHttpException<ApiErrorCode.ALREADY_VOIDED> {
    constructor() {
        super({
            code: ApiErrorCode.ALREADY_VOIDED,
            message: 'The entry was already voided',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
