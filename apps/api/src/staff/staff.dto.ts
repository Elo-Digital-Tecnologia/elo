import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ALL_PERMISSIONS, PERSON_NAME, RestaurantStaffRoles, type Role } from '@elo/core';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateRestaurantStaffDto {
  @IsString() @MinLength(3) @MaxLength(64) @Matches(/^[a-z0-9._-]+$/) username: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) @Matches(PERSON_NAME) name: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(30) displayName?: string;
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(RestaurantStaffRoles, { each: true }) roles: Role[];
}

export class UpdateRestaurantStaffDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) @Matches(PERSON_NAME) name?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(30) displayName?: string | null;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(RestaurantStaffRoles, { each: true }) roles?: Role[];
}

export class CreateEloStaffDto {
  @IsString() @MinLength(3) @MaxLength(64) @Matches(/^[a-z0-9._-]+$/) username: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) @Matches(PERSON_NAME) name: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsArray() @ArrayUnique() @IsIn(ALL_PERMISSIONS, { each: true }) permissions: string[];
}

export class UpdateEloStaffDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) @Matches(PERSON_NAME) name?: string;
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(ALL_PERMISSIONS, { each: true }) permissions?: string[];
}

export class SetActiveDto {
  @IsBoolean() active: boolean;
}

export class ChangePasswordDto {
  @IsString() @MinLength(8) @MaxLength(128) current: string;
  @IsString() @MinLength(8) @MaxLength(128) next: string;
}

export class ResetPasswordDto {
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}
