import type { TableState } from '@elo/core/tables/table-state';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class AdminTableListResponseDTO {
    @Expose()
    public slug: string;

    @Expose()
    public tables: Array<{
        id: string;
        name: string;
        state: TableState;
        token: string;
        url: string;
    }>;

    public static from(source: AdminTableListResponseDTO): AdminTableListResponseDTO {
        return plainToInstance(AdminTableListResponseDTO, source);
    }
}
