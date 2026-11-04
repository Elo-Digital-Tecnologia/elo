import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class ResourceNotFoundException extends ApiHttpException {
    constructor() {
        super({
            code: ApiErrorCode.NOT_FOUND,
            message: 'Not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
