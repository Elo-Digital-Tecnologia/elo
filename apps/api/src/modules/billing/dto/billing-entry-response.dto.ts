import type { BillingEntryKind, DocumentView } from '@elo/core/billing/billing';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class BillingEntryResponseDTO {
    @Expose()
    public id: string;

    @Expose()
    public kind: BillingEntryKind;

    @Expose()
    public amountCents: number;

    @Expose()
    public expectedCents: number | null;

    @Expose()
    public paidAt: string;

    @Expose()
    public periodStart: string | null;

    @Expose()
    public newDueDate: string;

    @Expose()
    public cycles: number | null;

    @Expose()
    public planName: string | null;

    @Expose()
    public note: string | null;

    @Expose()
    public recordedByName: string | null;

    @Expose()
    public voidedAt: string | null;

    @Expose()
    public voidedByName: string | null;

    @Expose()
    public voidReason: string | null;

    @Expose()
    public receipt: DocumentView | null;

    @Expose()
    public noReceiptReason: string | null;

    @Expose()
    public createdAt: string;

    public static from(source: BillingEntryResponseDTO): BillingEntryResponseDTO {
        return plainToInstance(BillingEntryResponseDTO, source);
    }
}
