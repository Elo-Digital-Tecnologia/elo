import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class AccessTokenResponseDTO {
    @Expose()
    public accessToken: string;

    public static from(source: AccessTokenResponseDTO): AccessTokenResponseDTO {
        return plainToInstance(AccessTokenResponseDTO, source);
    }
}
