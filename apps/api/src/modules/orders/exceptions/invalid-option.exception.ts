import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class InvalidOptionException extends ApiHttpException<ApiErrorCode.INVALID_OPTION> {
    constructor() {
        super({
            code: ApiErrorCode.INVALID_OPTION,
            message: 'Invalid option',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
