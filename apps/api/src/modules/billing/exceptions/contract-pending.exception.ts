import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ContractPendingException extends ApiHttpException<ApiErrorCode.CONTRACT_PENDING> {
    constructor() {
        super({
            code: ApiErrorCode.CONTRACT_PENDING,
            message: 'The contract is pending',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
