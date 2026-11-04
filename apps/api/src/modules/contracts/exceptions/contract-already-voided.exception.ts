import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ContractAlreadyVoidedException extends ApiHttpException<ApiErrorCode.CONTRACT_ALREADY_VOIDED> {
    constructor() {
        super({
            code: ApiErrorCode.CONTRACT_ALREADY_VOIDED,
            message: 'The contract was already voided',
            details: [],
            status: HttpStatus.CONFLICT
        });
    }
}
