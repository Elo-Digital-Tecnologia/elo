import type { Role } from '@elo/core/roles/roles';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class TeamMemberResponseDTO {
    @Expose()
    public id: string;

    @Expose()
    public name: string;

    @Expose()
    public username: string;

    @Expose()
    public roles: Array<Role>;

    @Expose()
    public active: boolean;

    public static from(source: TeamMemberResponseDTO): TeamMemberResponseDTO {
        return plainToInstance(TeamMemberResponseDTO, source);
    }
}
