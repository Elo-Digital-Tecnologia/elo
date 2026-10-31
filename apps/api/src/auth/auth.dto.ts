import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';
import { SLUG_PATTERN } from '@elo/core';

/**
 * Sign-in only bounds the size: a username or password that breaks the account
 * rules just fails like a wrong one (401), without telling what the rules are.
 */
export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString() @MaxLength(64) username: string;
  @IsString() @MaxLength(128) password: string;
}

export class SuperadminLoginDto {
  @IsString() @MaxLength(256) key: string;
}

export class RestaurantLoginParams {
  @Matches(SLUG_PATTERN) @MaxLength(60) slug: string;
}
