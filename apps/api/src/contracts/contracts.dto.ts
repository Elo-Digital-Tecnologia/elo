import { ContractKind, ContractOrigin, FIELD_RULES } from '@elo/core';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Field, IsDay } from '../common/validation';

export class SignatoryDto {
    @Field(FIELD_RULES.personName) name: string;
    @Field(FIELD_RULES.signatoryRole) role: string;
    @Field(FIELD_RULES.contact) contact: string;
}

export class ContractDto {
    @IsIn(Object.values(ContractKind)) kind: ContractKind;
    @IsIn(Object.values(ContractOrigin)) origin: ContractOrigin;
    @IsDay() signedOn: string;
    @IsDay() startsOn: string;
    @IsDay() endsOn: string;
    @ValidateNested() @Type(() => SignatoryDto) signatory: SignatoryDto;
    /** The signed file, uploaded first to /admin/restaurants/:id/documents as a contract. */
    @IsUUID() documentId: string;
    /** Plan signed in the contract; omitted, the restaurant's current plan. Its price is kept with the contract. */
    @IsOptional() @IsUUID() planId?: string;
    /** Free days of a first pilot contract, counted from its start. */
    @Field(FIELD_RULES.trialDays, { optional: true }) trialDays?: number;
}

export class ReasonDto {
    @Field(FIELD_RULES.reason) reason: string;
}
