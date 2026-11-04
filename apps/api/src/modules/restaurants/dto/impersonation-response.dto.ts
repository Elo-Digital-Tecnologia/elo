import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class ImpersonationResponseDTO {
    @Expose()
    public accessToken: string;

    @Expose()
    public slug: string;

    public static from(source: ImpersonationResponseDTO): ImpersonationResponseDTO {
        return plainToInstance(ImpersonationResponseDTO, source);
    }
}
