import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdjustmentDto {
  @IsString() @MinLength(2) @MaxLength(80) label: string;
  /** Positivo acrescenta, negativo dá desconto (centavos). */
  @IsInt() @Min(-1_000_000) @Max(1_000_000) cents: number;
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
}

export class WaiveFeeDto {
  @IsBoolean() waived: boolean;
}

export class RefuseFeeDto {
  @IsBoolean() refuse: boolean;
}
