import type { JwtUser } from '#/common/types/jwt-user.type.js';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission, canGrant, withRequired } from '@elo/core/roles/permissions';
import { Role } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { RequirePermission } from '#/common/decorators/require-permission.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { CreateEloStaffDTO } from './dto/create-elo-staff.dto.js';
import { OkResponseDTO } from './dto/ok-response.dto.js';
import { ResetPasswordDTO } from './dto/reset-password.dto.js';
import { SetActiveDTO } from './dto/set-active.dto.js';
import { StaffResponseDTO } from './dto/staff-response.dto.js';
import { UpdateEloStaffDTO } from './dto/update-elo-staff.dto.js';
import { CannotGrantException } from './exceptions/cannot-grant.exception.js';
import { TargetIsSelfException } from './exceptions/target-is-self.exception.js';
import { StaffService } from './staff.service.js';

/** Elo Digital team management: superadmin only (it has every permission, settings included). */
@ApiTags('admin-staff')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN, Role.ELO_ADMIN)
@RequirePermission(Permission.TEAM_MANAGE)
@Controller('admin/staff')
export class EloStaffController {
    constructor(private readonly staff: StaffService) {}

    @Get()
    public async list() {
        return (await this.staff.list(null)).map((item) => StaffResponseDTO.from(item));
    }

    @Post()
    public async create(@Body() dto: CreateEloStaffDTO, @CurrentUser() actor: JwtUser) {
        return StaffResponseDTO.from(
            await this.staff.create(
                {
                    restaurantId: null,
                    username: dto.username,
                    password: dto.password,
                    name: dto.name,
                    roles: [Role.ELO_ADMIN],
                    permissions: grantable(actor, dto.permissions)
                },
                actor
            )
        );
    }

    @Patch(':id')
    public async update(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser,
        @Body() dto: UpdateEloStaffDTO
    ) {
        if (dto.permissions && actor.sub === id) throw new TargetIsSelfException();
        return StaffResponseDTO.from(
            await this.staff.update(id, null, actor, {
                name: dto.name,
                ...(dto.permissions
                    ? { permissions: grantable(actor, dto.permissions) }
                    : {})
            })
        );
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @Patch(':id/password')
    public resetPassword(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser,
        @Body() dto: ResetPasswordDTO
    ) {
        return this.staff.resetPassword(id, null, actor, dto.password);
    }

    @Patch(':id/active')
    public async setActive(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser,
        @Body() dto: SetActiveDTO
    ) {
        await this.staff.setActive(id, null, actor, dto.active);
        return OkResponseDTO.from({ ok: true });
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(':id')
    public archive(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser
    ) {
        return this.staff.archive(id, null, actor);
    }
}

/** Adds what each permission depends on, then refuses anything the actor may not hand out. */
function grantable(actor: JwtUser, requested: string[]): string[] {
    const perms = withRequired(requested);
    const superadmin = actor.roles.includes(Role.SUPERADMIN);
    const denied = perms.filter(
        (p) => !canGrant({ superadmin, permissions: actor.permissions }, p)
    );
    if (denied.length) throw new CannotGrantException({ permissions: denied });
    return perms;
}
