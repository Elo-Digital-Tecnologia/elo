import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class DuplicateOptionException extends ApiHttpException<ApiErrorCode.DUPLICATE_OPTION> {
    constructor() {
        super({
            code: ApiErrorCode.DUPLICATE_OPTION,
            message: 'Duplicate option',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
