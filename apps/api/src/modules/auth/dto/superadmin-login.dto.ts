import { CREDENTIAL_INPUT_LIMITS } from '@elo/core/fields/field-rules';
import { IsString, MaxLength } from 'class-validator';

export class SuperadminLoginDTO {
    @IsString()
    @MaxLength(CREDENTIAL_INPUT_LIMITS.superadminKey)
    public key: string;
}
