import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class FileTooLargeException extends ApiHttpException<ApiErrorCode.FILE_TOO_LARGE> {
    constructor() {
        super({
            code: ApiErrorCode.FILE_TOO_LARGE,
            message: 'The file is too large',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
