import { IsString, Matches } from 'class-validator';
import { TABLE_TOKEN_PATTERN } from '#/modules/tables/table.constants.js';
import { SlugParamsDTO } from './slug-params.dto.js';

export class TableParamsDTO extends SlugParamsDTO {
    @IsString()
    @Matches(TABLE_TOKEN_PATTERN)
    public token: string;
}
