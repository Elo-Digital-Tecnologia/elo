import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { ApiHttpException } from '#/common/exceptions/api.exception.js';

export class ContractNotFoundException extends ApiHttpException<ApiErrorCode.CONTRACT_NOT_FOUND> {
    constructor() {
        super({
            code: ApiErrorCode.CONTRACT_NOT_FOUND,
            message: 'Contract not found',
            details: [],
            status: HttpStatus.NOT_FOUND
        });
    }
}
