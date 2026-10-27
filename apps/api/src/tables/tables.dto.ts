import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTableDto {
  @IsString() @MinLength(1) @MaxLength(40) name: string;
}
