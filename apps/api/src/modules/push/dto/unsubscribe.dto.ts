import { IsString, MaxLength } from 'class-validator';
import { PUSH_ENDPOINT_MAX_LENGTH } from '../push.constants.js';

export class UnsubscribeDTO {
    @IsString()
    @MaxLength(PUSH_ENDPOINT_MAX_LENGTH)
    public endpoint: string;
}
