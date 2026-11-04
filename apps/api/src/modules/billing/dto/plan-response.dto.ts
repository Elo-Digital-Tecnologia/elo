import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class PlanResponseDTO {
    @Expose()
    public id: string;

    @Expose()
    public name: string;

    @Expose()
    public priceCents: number;

    @Expose()
    public cycleMonths: number;

    @Expose()
    public active: boolean;

    @Expose()
    public createdAt: Date;

    public static from(source: PlanResponseDTO): PlanResponseDTO {
        return plainToInstance(PlanResponseDTO, source);
    }
}
