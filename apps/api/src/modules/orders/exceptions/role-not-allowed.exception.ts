import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class RoleNotAllowedException extends ApiHttpException<ApiErrorCode.ROLE_NOT_ALLOWED> {
    constructor() {
        super({
            code: ApiErrorCode.ROLE_NOT_ALLOWED,
            message: 'Your role cannot do this',
            details: [],
            status: HttpStatus.FORBIDDEN
        });
    }
}
