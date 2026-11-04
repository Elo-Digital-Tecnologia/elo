import type { ActivityCategory } from '@elo/core/activity/activity-actions';
import { ACTIVITY_CATEGORIES } from '@elo/core/activity/activity-actions';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AUDIT_LOG_MAX_PAGE, AUDIT_LOG_MAX_PAGE_SIZE } from '../audit-log.constants.js';

export class FindAuditLogsQueryDTO {
    @IsOptional()
    @IsIn([...ACTIVITY_CATEGORIES])
    public category?: ActivityCategory;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(AUDIT_LOG_MAX_PAGE)
    public page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(5)
    @Max(AUDIT_LOG_MAX_PAGE_SIZE)
    public pageSize?: number;
}
