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
import { Throttle } from '@nestjs/throttler';
import { RestaurantManagerRoles, Role } from '@elo/core/roles/roles';
import { RATE_LIMITS } from '#/common/constants.js';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { NoImpersonation } from '#/common/decorators/no-impersonation.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { CreateRestaurantStaffDTO } from './dto/create-restaurant-staff.dto.js';
import { OkResponseDTO } from './dto/ok-response.dto.js';
import { ResetPasswordDTO } from './dto/reset-password.dto.js';
import { SetActiveDTO } from './dto/set-active.dto.js';
import { StaffResponseDTO } from './dto/staff-response.dto.js';
import { TransferOwnershipDTO } from './dto/transfer-ownership.dto.js';
import { UpdateRestaurantStaffDTO } from './dto/update-restaurant-staff.dto.js';
import { StaffService } from './staff.service.js';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
    constructor(private readonly staff: StaffService) {}

    @Roles(...RestaurantManagerRoles)
    @Get()
    public async list(@TenantId() restaurantId: string) {
        return (await this.staff.list(restaurantId)).map((item) =>
            StaffResponseDTO.from(item)
        );
    }

    @Roles(...RestaurantManagerRoles)
    @Post()
    public async create(
        @TenantId() restaurantId: string,
        @Body() dto: CreateRestaurantStaffDTO,
        @CurrentUser() actor: JwtUser
    ) {
        return StaffResponseDTO.from(
            await this.staff.create({ restaurantId, ...dto }, actor)
        );
    }

    @Roles(...RestaurantManagerRoles)
    @Patch(':id')
    public async update(
        @TenantId() restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser,
        @Body() dto: UpdateRestaurantStaffDTO
    ) {
        return StaffResponseDTO.from(
            await this.staff.update(id, restaurantId, actor, dto)
        );
    }

    @Roles(...RestaurantManagerRoles)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(':id')
    public archive(
        @TenantId() restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser
    ) {
        return this.staff.archive(id, restaurantId, actor);
    }

    /** Elo support may set a new password here: it is how a locked-out administrator gets back in. */
    @Roles(...RestaurantManagerRoles)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Patch(':id/password')
    public resetPassword(
        @TenantId() restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser,
        @Body() dto: ResetPasswordDTO
    ) {
        return this.staff.resetPassword(id, restaurantId, actor, dto.password);
    }

    @Roles(Role.RESTAURANT_ADMIN)
    @NoImpersonation()
    @Throttle(RATE_LIMITS.PASSWORD_CHANGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Post(':id/transfer-ownership')
    public transferOwnership(
        @TenantId() restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser,
        @Body() dto: TransferOwnershipDTO
    ) {
        return this.staff.transferOwnership(restaurantId, id, actor, {
            password: dto.password
        });
    }

    @Roles(...RestaurantManagerRoles)
    @Patch(':id/active')
    public async setActive(
        @TenantId() restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser,
        @Body() dto: SetActiveDTO
    ) {
        await this.staff.setActive(id, restaurantId, actor, dto.active);
        return OkResponseDTO.from({ ok: true });
    }
}
