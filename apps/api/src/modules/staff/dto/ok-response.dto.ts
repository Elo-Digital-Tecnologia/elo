import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class OkResponseDTO {
    @Expose()
    public ok: boolean;

    public static from(source: OkResponseDTO): OkResponseDTO {
        return plainToInstance(OkResponseDTO, source);
    }
}
