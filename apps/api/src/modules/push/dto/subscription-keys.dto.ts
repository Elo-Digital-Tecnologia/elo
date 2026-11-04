import { IsString, Matches, MaxLength } from 'class-validator';
import { PUSH_AUTH_MAX_LENGTH, PUSH_P256DH_MAX_LENGTH } from '../push.constants.js';

const B64URL = /^[A-Za-z0-9_-]+$/;

export class SubscriptionKeysDTO {
    @IsString()
    @Matches(B64URL)
    @MaxLength(PUSH_P256DH_MAX_LENGTH)
    public p256dh: string;

    @IsString()
    @Matches(B64URL)
    @MaxLength(PUSH_AUTH_MAX_LENGTH)
    public auth: string;
}
