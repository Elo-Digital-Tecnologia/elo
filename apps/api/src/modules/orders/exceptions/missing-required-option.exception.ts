import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class MissingRequiredOptionException extends ApiHttpException<ApiErrorCode.MISSING_REQUIRED_OPTION> {
    constructor() {
        super({
            code: ApiErrorCode.MISSING_REQUIRED_OPTION,
            message: 'A required option is missing',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
