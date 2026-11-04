import type { JwtUser } from '#/common/types/jwt-user.type.js';
import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RATE_LIMITS } from '#/common/constants.js';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { NoImpersonation } from '#/common/decorators/no-impersonation.decorator.js';
import { ChangePasswordDTO } from './dto/change-password.dto.js';
import { CurrentStaffResponseDTO } from './dto/current-staff-response.dto.js';
import { SuperadminUsesEnvKeyException } from './exceptions/superadmin-uses-env-key.exception.js';
import { StaffService } from './staff.service.js';

/** Changing one's own password (any signed-in member; the superadmin key lives only in the environment). */
@ApiTags('staff')
@ApiBearerAuth()
@Controller('me')
export class MeController {
    constructor(private readonly staff: StaffService) {}

    /** Who is signed in, with the profile photo the shell shows in the header. */
    @Get()
    public async me(@CurrentUser() user: JwtUser) {
        if (user.sub === 'superadmin' || user.impersonatedBy)
            return CurrentStaffResponseDTO.from({
                id: user.sub,
                name: user.name ?? null,
                avatarUrl: null
            });
        const [row] = await this.staff.profiles([user.sub]);
        return CurrentStaffResponseDTO.from({
            id: user.sub,
            name: row?.name ?? user.name ?? null,
            avatarUrl: row?.avatarUrl ?? null
        });
    }

    @NoImpersonation()
    @Throttle(RATE_LIMITS.PASSWORD_CHANGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Patch('password')
    public async changePassword(
        @CurrentUser() user: JwtUser,
        @Body() dto: ChangePasswordDTO
    ) {
        if (user.sub === 'superadmin') throw new SuperadminUsesEnvKeyException();
        await this.staff.changePassword(user.sub, dto.current, dto.next, user.sid);
    }
}
