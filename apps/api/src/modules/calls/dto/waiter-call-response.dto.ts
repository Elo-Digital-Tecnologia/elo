import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class WaiterCallResponseDTO {
    @Expose()
    public id: string;

    @Expose()
    public restaurantId: string;

    @Expose()
    public tableId: string;

    @Expose()
    public resolvedAt: Date | null;

    @Expose()
    public resolvedBy: string | null;

    @Expose()
    public createdAt: Date;

    public static from(source: WaiterCallResponseDTO): WaiterCallResponseDTO {
        return plainToInstance(WaiterCallResponseDTO, source);
    }
}
