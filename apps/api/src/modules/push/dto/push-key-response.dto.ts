import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class PushKeyResponseDTO {
    @Expose()
    public key: string | null;

    public static from(source: PushKeyResponseDTO): PushKeyResponseDTO {
        return plainToInstance(PushKeyResponseDTO, source);
    }
}
