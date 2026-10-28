import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString() @MinLength(3) @MaxLength(64) username: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}

export class SuperadminLoginDto {
  @IsString() @MinLength(24) @MaxLength(256) key: string;
}
