import type { ActivityView } from '@elo/core/activity/activity-actions';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class AuditLogPageResponseDTO {
    @Expose()
    public items: Array<ActivityView>;

    @Expose()
    public total: number;

    @Expose()
    public page: number;

    @Expose()
    public pageSize: number;

    public static from(source: AuditLogPageResponseDTO): AuditLogPageResponseDTO {
        return plainToInstance(AuditLogPageResponseDTO, source);
    }
}
