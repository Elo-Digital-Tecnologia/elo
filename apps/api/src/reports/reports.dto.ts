import { IsOptional } from 'class-validator';
import { IsDay } from '../common/validation';

/** Período em dias do calendário do restaurante, extremos incluídos. */
export class ReportQuery {
  @IsOptional() @IsDay() from?: string;
  @IsOptional() @IsDay() to?: string;
}
