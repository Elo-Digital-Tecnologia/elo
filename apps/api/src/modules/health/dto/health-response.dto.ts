import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class HealthResponseDTO {
    @Expose()
    public status: string;

    public static from(source: HealthResponseDTO): HealthResponseDTO {
        return plainToInstance(HealthResponseDTO, source);
    }
}
