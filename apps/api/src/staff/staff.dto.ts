import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALL_PERMISSIONS, RestaurantStaffRoles } from '@elo/core';

export class CreateRestaurantStaffDto {
  @IsString() @MinLength(3) @MaxLength(64) @Matches(/^[a-z0-9._-]+$/) username: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsIn(RestaurantStaffRoles) role: string;
}

export class CreateEloStaffDto {
  @IsString() @MinLength(3) @MaxLength(64) @Matches(/^[a-z0-9._-]+$/) username: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsArray() @ArrayUnique() @IsIn(ALL_PERMISSIONS, { each: true }) permissions: string[];
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
