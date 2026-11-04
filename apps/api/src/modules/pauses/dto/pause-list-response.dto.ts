import type { PauseList, PauseView } from '@elo/core/api/views/pause.view';
import type { Availability } from '@elo/core/opening-hours/open-status';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class PauseListResponseDTO implements PauseList {
    @Expose()
    public availability: Availability;

    @Expose()
    public upcoming: Array<PauseView>;

    @Expose()
    public past: { items: PauseView[]; total: number; page: number; pageSize: number };

    public static from(source: PauseListResponseDTO): PauseListResponseDTO {
        return plainToInstance(PauseListResponseDTO, source);
    }
}
