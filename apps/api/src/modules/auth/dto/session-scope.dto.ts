import { IsString, MaxLength } from 'class-validator';
import { SESSION_SCOPE_MAX_LENGTH } from '../auth.constants.js';

export class SessionScopeDTO {
    @IsString()
    @MaxLength(SESSION_SCOPE_MAX_LENGTH)
    public scope: string;
}
