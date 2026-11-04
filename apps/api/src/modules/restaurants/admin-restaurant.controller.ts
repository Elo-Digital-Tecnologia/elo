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
    Post,
    Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@elo/core/roles/permissions';
import { Role } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { RequirePermission } from '#/common/decorators/require-permission.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { AccessDeniedException } from '#/common/exceptions/access-denied.exception.js';
import { StaffService } from '#/modules/staff/staff.service.js';
import { ChangeOwnerDTO } from './dto/change-owner.dto.js';
import { ChangeSlugDTO } from './dto/change-slug.dto.js';
import { CreateRestaurantDTO } from './dto/create-restaurant.dto.js';
import { DeleteRestaurantDTO } from './dto/delete-restaurant.dto.js';
import { EditRestaurantDTO } from './dto/edit-restaurant.dto.js';
import { ImpersonationResponseDTO } from './dto/impersonation-response.dto.js';
import { ListRestaurantsQueryDTO } from './dto/list-restaurants-query.dto.js';
import { RestaurantDetailResponseDTO } from './dto/restaurant-detail-response.dto.js';
import { RestaurantExportResponseDTO } from './dto/restaurant-export-response.dto.js';
import { RestaurantListResponseDTO } from './dto/restaurant-list-response.dto.js';
import { RestaurantResponseDTO } from './dto/restaurant-response.dto.js';
import { TeamMemberResponseDTO } from './dto/team-member-response.dto.js';
import { RestaurantLifecycleService } from './restaurant-lifecycle.service.js';
import { RestaurantService } from './restaurant.service.js';

const ELO = [Role.SUPERADMIN, Role.ELO_ADMIN];

/** Dashboard Elo Digital. */
@ApiTags('admin-restaurants')
@ApiBearerAuth()
@Roles(...ELO)
@Controller('admin')
export class AdminRestaurantController {
    constructor(
        private readonly restaurants: RestaurantService,
        private readonly lifecycle: RestaurantLifecycleService,
        private readonly staff: StaffService
    ) {}

    @Get('overview')
    public overview() {
        return this.restaurants.overview();
    }

    @RequirePermission(Permission.RESTAURANTS_VIEW)
    @Get('restaurants')
    public async list(@Query() q: ListRestaurantsQueryDTO, @CurrentUser() user: JwtUser) {
        const canSeeDeleted =
            user.roles.includes(Role.SUPERADMIN) ||
            user.permissions.includes(Permission.RESTAURANTS_DELETE);
        if (q.status === 'deleted' && !canSeeDeleted) throw new AccessDeniedException();
        return RestaurantListResponseDTO.from(
            await this.restaurants.search(q, canSeeDeleted)
        );
    }

    @RequirePermission(Permission.RESTAURANTS_CREATE)
    @Post('restaurants')
    public async create(@Body() dto: CreateRestaurantDTO) {
        return RestaurantResponseDTO.from(await this.restaurants.create(dto));
    }

    @RequirePermission(Permission.RESTAURANTS_VIEW)
    @Get('restaurants/:id')
    public async get(@Param('id', ParseUUIDPipe) id: string) {
        const r = await this.restaurants.get(id);
        return RestaurantDetailResponseDTO.from({
            ...r,
            subscription: await this.restaurants.subscription(r)
        });
    }

    @RequirePermission(Permission.RESTAURANTS_VIEW)
    @Get('restaurants/:id/staff')
    public async team(@Param('id', ParseUUIDPipe) id: string) {
        await this.restaurants.get(id);
        const rows = await this.staff.list(id);
        return rows
            .map(({ id: userId, name, username, roles, active }) => ({
                id: userId,
                name,
                username,
                roles,
                active
            }))
            .map((item) => TeamMemberResponseDTO.from(item));
    }

    /** Recovery path when the owner left or lost access: Elo support names the new owner, with a reason. */
    @RequirePermission(Permission.RESTAURANTS_OWNER)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Post('restaurants/:id/owner')
    public async changeOwner(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ChangeOwnerDTO,
        @CurrentUser() user: JwtUser
    ) {
        await this.restaurants.get(id);
        await this.staff.transferOwnership(id, dto.userId, user, { reason: dto.reason });
    }

    @RequirePermission(Permission.RESTAURANTS_EDIT)
    @Patch('restaurants/:id')
    public async edit(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: EditRestaurantDTO,
        @CurrentUser() user: JwtUser
    ) {
        return RestaurantResponseDTO.from(await this.restaurants.edit(id, dto, user));
    }

    @RequirePermission(Permission.RESTAURANTS_EDIT)
    @Post('restaurants/:id/slug')
    public async changeSlug(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ChangeSlugDTO,
        @CurrentUser() user: JwtUser
    ) {
        return RestaurantResponseDTO.from(
            await this.lifecycle.changeSlug(id, dto.slug, dto.reason, user)
        );
    }

    @RequirePermission(Permission.RESTAURANTS_SUSPEND)
    @Post('restaurants/:id/suspend')
    public async suspend(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return RestaurantResponseDTO.from(
            await this.lifecycle.setSuspended(id, true, user)
        );
    }

    @RequirePermission(Permission.RESTAURANTS_SUSPEND)
    @Post('restaurants/:id/reactivate')
    public async reactivate(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return RestaurantResponseDTO.from(
            await this.lifecycle.setSuspended(id, false, user)
        );
    }

    /** Soft delete of a suspended restaurant; the slug must be typed back. */
    @RequirePermission(Permission.RESTAURANTS_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('restaurants/:id')
    public remove(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: DeleteRestaurantDTO,
        @CurrentUser() user: JwtUser
    ) {
        return this.lifecycle.remove(id, user, dto.confirmSlug);
    }

    @RequirePermission(Permission.RESTAURANTS_DELETE)
    @Post('restaurants/:id/restore')
    public async restore(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return RestaurantResponseDTO.from(await this.lifecycle.restore(id, user));
    }

    /** Data of a restaurant (deleted ones included) to hand back to the client. */
    @RequirePermission(Permission.RESTAURANTS_DELETE)
    @Get('restaurants/:id/export')
    public async export(@Param('id', ParseUUIDPipe) id: string) {
        return RestaurantExportResponseDTO.from(await this.lifecycle.export(id));
    }

    /** The Elo team enters the restaurant panel (support). Short-lived token, recorded in the audit log. */
    @RequirePermission(Permission.RESTAURANTS_ACCESS)
    @Post('restaurants/:id/access')
    public async access(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser
    ) {
        return ImpersonationResponseDTO.from(await this.restaurants.accessAs(id, user));
    }
}
