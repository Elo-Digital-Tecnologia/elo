import { ContractKind, ContractOrigin } from '@elo/core/contracts/contracts';
import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { IsDay } from '#/common/decorators/is-day.decorator.js';
import { SignatoryDTO } from './signatory.dto.js';

export class ContractDTO {
    @IsIn(Object.values(ContractKind))
    public kind: ContractKind;

    @IsIn(Object.values(ContractOrigin))
    public origin: ContractOrigin;

    @IsDay()
    public signedOn: string;

    @IsDay()
    public startsOn: string;

    @IsDay()
    public endsOn: string;

    @ValidateNested()
    @Type(() => SignatoryDTO)
    public signatory: SignatoryDTO;

    /** The signed file, uploaded first to /admin/restaurants/:id/documents as a contract. */
    @IsUUID()
    public documentId: string;

    /** Plan signed in the contract; omitted, the restaurant's current plan. Its price is kept with the contract. */
    @IsOptional()
    @IsUUID()
    public planId?: string;

    /** Free days of a first pilot contract, counted from its start. */
    @Field(FIELD_RULES.trialDays, { optional: true })
    public trialDays?: number;
}
