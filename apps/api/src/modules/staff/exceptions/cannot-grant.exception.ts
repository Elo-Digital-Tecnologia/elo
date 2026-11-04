import type { ApiCannotGrantDetail } from '@elo/core/api/api-error-detail';
import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class CannotGrantException extends ApiHttpException<ApiErrorCode.CANNOT_GRANT> {
    constructor(denied: ApiCannotGrantDetail) {
        super({
            code: ApiErrorCode.CANNOT_GRANT,
            message: 'Cannot grant these permissions',
            details: [denied],
            status: HttpStatus.FORBIDDEN
        });
    }
}
