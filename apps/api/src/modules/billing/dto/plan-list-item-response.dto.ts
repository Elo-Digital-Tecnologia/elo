import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class PlanListItemResponseDTO {
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
    public restaurants: number;

    public static from(source: PlanListItemResponseDTO): PlanListItemResponseDTO {
        return plainToInstance(PlanListItemResponseDTO, source);
    }
}
