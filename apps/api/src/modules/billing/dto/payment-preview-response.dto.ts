import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class PaymentPreviewResponseDTO {
    @Expose()
    public periodStart: string;

    @Expose()
    public newDueDate: string;

    @Expose()
    public expectedCents: number;

    @Expose()
    public restartsFromPayment: boolean;

    public static from(source: PaymentPreviewResponseDTO): PaymentPreviewResponseDTO {
        return plainToInstance(PaymentPreviewResponseDTO, source);
    }
}
