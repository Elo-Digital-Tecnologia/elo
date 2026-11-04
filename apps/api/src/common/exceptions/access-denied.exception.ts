import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from './api.exception.js';

export class AccessDeniedException extends ApiHttpException {
    constructor() {
        super({
            code: ApiErrorCode.FORBIDDEN,
            message: 'Forbidden',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
