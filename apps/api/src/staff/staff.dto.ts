import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ALL_PERMISSIONS, FIELD_RULES, RestaurantStaffRoles, type Role } from '@elo/core';
import { Field } from '../common/validation';

export class CreateRestaurantStaffDto {
  @Field(FIELD_RULES.username) username: string;
  @Field(FIELD_RULES.password) password: string;
  @Field(FIELD_RULES.personName) name: string;
  @Field(FIELD_RULES.displayName, { optional: true }) displayName?: string | null;
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(RestaurantStaffRoles, { each: true }) roles: Role[];
}

export class UpdateRestaurantStaffDto {
  @Field(FIELD_RULES.personName, { optional: true }) name?: string;
  @Field(FIELD_RULES.displayName, { optional: true }) displayName?: string | null;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(RestaurantStaffRoles, { each: true }) roles?: Role[];
}

export class CreateEloStaffDto {
  @Field(FIELD_RULES.username) username: string;
  @Field(FIELD_RULES.personName) name: string;
  @Field(FIELD_RULES.password) password: string;
  @IsArray() @ArrayUnique() @IsIn(ALL_PERMISSIONS, { each: true }) permissions: string[];
}

export class UpdateEloStaffDto {
  @Field(FIELD_RULES.personName, { optional: true }) name?: string;
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(ALL_PERMISSIONS, { each: true }) permissions?: string[];
}

export class SetActiveDto {
  @IsBoolean() active: boolean;
}

export class ChangePasswordDto {
  /** Only checked against the stored hash: a wrong one answers 401 whatever its size. */
  @IsString() @MaxLength(128) current: string;
  @Field(FIELD_RULES.password) next: string;
}

export class ResetPasswordDto {
  @Field(FIELD_RULES.password) password: string;
}

export class TransferOwnershipDto {
  @IsString() @MaxLength(128) password: string;
}
