import type { PauseView } from '@elo/core/api/views/pause.view';
import type { PauseKind } from '@elo/core/opening-hours/open-status';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class PauseResponseDTO implements PauseView {
    @Expose()
    public id: string;

    @Expose()
    public kind: PauseKind;

    @Expose()
    public startsAt: string;

    @Expose()
    public endsAt: string | null;

    @Expose()
    public endedAt: string | null;

    @Expose()
    public reason: string | null;

    @Expose()
    public createdByName: string | null;

    @Expose()
    public createdAt: string;

    public static from(source: PauseResponseDTO): PauseResponseDTO {
        return plainToInstance(PauseResponseDTO, source);
    }
}
