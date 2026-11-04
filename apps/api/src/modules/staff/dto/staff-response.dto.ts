import type { Role } from '@elo/core/roles/roles';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class StaffResponseDTO {
    @Expose()
    public name: string;

    @Expose()
    public active: boolean;

    @Expose()
    public id: string;

    @Expose()
    public restaurantId: string | null;

    @Expose()
    public createdAt: Date;

    @Expose()
    public username: string;

    @Expose()
    public displayName: string | null;

    @Expose()
    public avatarUrl: string | null;

    @Expose()
    public roles: Array<Role>;

    @Expose()
    public permissions: Array<string>;

    @Expose()
    public deletedAt: Date | null;

    public static from(source: StaffResponseDTO): StaffResponseDTO {
        return plainToInstance(StaffResponseDTO, source);
    }
}
