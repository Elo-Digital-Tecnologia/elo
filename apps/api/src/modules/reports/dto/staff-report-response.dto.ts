import type {
    StaffPerformanceRow,
    StaffReportView
} from '@elo/core/api/views/report.view';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class StaffReportResponseDTO implements StaffReportView {
    @Expose()
    public from: string;

    @Expose()
    public to: string;

    @Expose()
    public rows: Array<StaffPerformanceRow>;

    public static from(source: StaffReportResponseDTO): StaffReportResponseDTO {
        return plainToInstance(StaffReportResponseDTO, source);
    }
}
