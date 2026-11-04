import type { TableState } from '@elo/core/tables/table-state';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class DiningTableResponseDTO {
    @Expose()
    public id: string;

    @Expose()
    public restaurantId: string;

    @Expose()
    public name: string;

    @Expose()
    public token: string;

    @Expose()
    public state: TableState;

    @Expose()
    public waiterId: string | null;

    public static from(source: DiningTableResponseDTO): DiningTableResponseDTO {
        return plainToInstance(DiningTableResponseDTO, source);
    }
}
