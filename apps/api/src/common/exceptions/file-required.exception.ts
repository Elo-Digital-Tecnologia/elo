import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class FileRequiredException extends ApiHttpException {
    constructor() {
        super({
            code: ApiErrorCode.FILE_REQUIRED,
            message: 'A file is required',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
