import { CREDENTIAL_INPUT_LIMITS } from '@elo/core/fields/field-rules';
import { IsString, MaxLength } from 'class-validator';

export class TransferOwnershipDTO {
    @IsString()
    @MaxLength(CREDENTIAL_INPUT_LIMITS.password)
    public password: string;
}
