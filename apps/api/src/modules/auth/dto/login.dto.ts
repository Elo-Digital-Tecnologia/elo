import { CREDENTIAL_INPUT_LIMITS } from '@elo/core/fields/field-rules';
import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

/**
 * Sign-in only bounds the size: a username or password that breaks the account
 * rules just fails like a wrong one (401), without telling what the rules are.
 */
export class LoginDTO {
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value
    )
    @IsString()
    @MaxLength(CREDENTIAL_INPUT_LIMITS.username)
    public username: string;

    @IsString()
    @MaxLength(CREDENTIAL_INPUT_LIMITS.password)
    public password: string;
}
