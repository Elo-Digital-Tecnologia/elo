import { IsOptional } from 'class-validator';
import { IsDay } from '#/common/decorators/is-day.decorator.js';

/** Period in days of the restaurant's calendar, both ends included. */
export class ReportQueryDTO {
    @IsOptional()
    @IsDay()
    public from?: string;

    @IsOptional()
    @IsDay()
    public to?: string;
}
