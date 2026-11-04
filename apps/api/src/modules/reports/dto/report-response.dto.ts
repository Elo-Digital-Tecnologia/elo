import type { ReportView } from '@elo/core/api/views/report.view';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class ReportResponseDTO implements ReportView {
    @Expose()
    public from: string;

    @Expose()
    public to: string;

    @Expose()
    public totals: {
        revenueCents: number;
        orders: number;
        items: number;
        averageTicketCents: number;
        cancelled: number;
        returned: number;
    };

    @Expose()
    public byDay: Array<{ date: string; revenueCents: number; orders: number }>;

    @Expose()
    public byHour: Array<{ hour: number; orders: number }>;

    @Expose()
    public topProducts: Array<{ name: string; quantity: number; revenueCents: number }>;

    public static from(source: ReportResponseDTO): ReportResponseDTO {
        return plainToInstance(ReportResponseDTO, source);
    }
}
