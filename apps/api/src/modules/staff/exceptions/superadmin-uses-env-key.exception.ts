import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class SuperadminUsesEnvKeyException extends ApiHttpException<ApiErrorCode.SUPERADMIN_USES_ENV_KEY> {
    constructor() {
        super({
            code: ApiErrorCode.SUPERADMIN_USES_ENV_KEY,
            message: 'The superadmin signs in with the environment key',
            details: [],
            status: HttpStatus.BAD_REQUEST
        });
    }
}
