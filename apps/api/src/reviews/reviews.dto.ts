import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ReviewDto {
  @IsInt() @Min(1) @Max(5) stars: number;
  @Transform(({ value }) => (typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value))
  @IsOptional() @IsString() @MaxLength(300) comment?: string | null;
}
