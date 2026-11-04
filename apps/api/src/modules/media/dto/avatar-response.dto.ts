import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class AvatarResponseDTO {
    @Expose()
    public avatarUrl: string;

    public static from(source: AvatarResponseDTO): AvatarResponseDTO {
        return plainToInstance(AvatarResponseDTO, source);
    }
}
