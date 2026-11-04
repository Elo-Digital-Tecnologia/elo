import { Type } from 'class-transformer';
import { IsUrl, MaxLength, ValidateBy, ValidateNested } from 'class-validator';
import { PUSH_ENDPOINT_MAX_LENGTH } from '../push.constants.js';
import { isPushEndpoint } from '../utils/push-endpoint.js';
import { SubscriptionKeysDTO } from './subscription-keys.dto.js';

export class SubscribeDTO {
    @IsUrl({ protocols: ['https'], require_tld: true })
    @ValidateBy({
        name: 'pushEndpoint',
        validator: {
            validate: (v: unknown) => typeof v === 'string' && isPushEndpoint(v)
        }
    })
    @MaxLength(PUSH_ENDPOINT_MAX_LENGTH)
    public endpoint: string;

    @ValidateNested()
    @Type(() => SubscriptionKeysDTO)
    public keys: SubscriptionKeysDTO;
}
