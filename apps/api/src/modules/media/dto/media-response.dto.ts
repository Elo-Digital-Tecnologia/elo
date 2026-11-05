import type { MediaView } from '@elo/core/api/views/media.view';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class MediaResponseDTO implements MediaView {
    @Expose()
    public id: string;

    @Expose()
    public url: string;

    @Expose()
    public thumbUrl: string;

    @Expose()
    public width: number;

    @Expose()
    public height: number;

    @Expose()
    public bytes: number;

    @Expose()
    public name: string;

    @Expose()
    public inUse: boolean;

    public static from(source: MediaResponseDTO): MediaResponseDTO {
        return plainToInstance(MediaResponseDTO, source);
    }
}
