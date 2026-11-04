import type { TableView } from '@elo/core/api/views/table.view';
import type { TableState } from '@elo/core/tables/table-state';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

type TableSource = TableView & { restaurantId: string; token: string };

@Exclude()
export class TableResponseDTO implements TableView {
    @Expose()
    public id: string;

    @Expose()
    public restaurantId: string;

    @Expose()
    public name: string;

    @Expose()
    public state: TableState;

    @Expose()
    public waiterId: string | null;

    @Expose()
    public waiterName?: string | null | undefined;

    /** The full token only goes to who manages tables (QR code and link). */
    @Expose()
    public token?: string | undefined;

    public static from(table: TableSource, { withToken }: { withToken: boolean }) {
        const { token, ...rest } = table;
        return plainToInstance(TableResponseDTO, withToken ? { ...rest, token } : rest);
    }
}
