import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PAUSE_MAX_PAGE } from '../pause.constants.js';

export class ListPausesQueryDTO {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(PAUSE_MAX_PAGE)
    public page?: number;
}
