import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class ResourceConflictException extends ApiHttpException {
    constructor() {
        super({
            code: ApiErrorCode.CONFLICT,
            message: 'Conflict',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
