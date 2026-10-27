import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() @MinLength(3) @MaxLength(64) username: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}

export class SuperadminLoginDto {
  @IsString() @MinLength(24) @MaxLength(256) key: string;
}
