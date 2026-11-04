import type {
    BillAdjustmentView,
    BillLineView,
    BillView,
    FeeWaivedBy
} from '@elo/core/api/views/bill.view';
import type { TableState } from '@elo/core/tables/table-state';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class BillResponseDTO implements BillView {
    @Expose()
    public tableId: string;

    @Expose()
    public tableName: string;

    @Expose()
    public state: TableState;

    @Expose()
    public serviceFeeBps: number;

    @Expose()
    public feeWaivedBy: FeeWaivedBy | null;

    @Expose()
    public guestCanRefuseFee: boolean;

    @Expose()
    public lines: Array<BillLineView>;

    @Expose()
    public adjustments: Array<BillAdjustmentView>;

    @Expose()
    public subtotalCents: number;

    @Expose()
    public serviceFeeCents: number;

    @Expose()
    public adjustmentsCents: number;

    @Expose()
    public totalCents: number;

    public static from(source: BillResponseDTO): BillResponseDTO {
        return plainToInstance(BillResponseDTO, source);
    }
}
