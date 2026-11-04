import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class CurrentStaffResponseDTO {
    @Expose()
    public id: string;

    @Expose()
    public name: string | null;

    @Expose()
    public avatarUrl: string | null;

    public static from(source: CurrentStaffResponseDTO): CurrentStaffResponseDTO {
        return plainToInstance(CurrentStaffResponseDTO, source);
    }
}
