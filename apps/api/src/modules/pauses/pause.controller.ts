import type { JwtUser } from '#/common/types/jwt-user.type.js';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { CreatePauseDTO } from './dto/create-pause.dto.js';
import { ListPausesQueryDTO } from './dto/list-pauses-query.dto.js';
import { PauseListResponseDTO } from './dto/pause-list-response.dto.js';
import { PauseResponseDTO } from './dto/pause-response.dto.js';
import { PauseService } from './pause.service.js';

@ApiTags('pauses')
@ApiBearerAuth()
@Roles(...RestaurantManagerRoles)
@Controller('restaurant/pauses')
export class PauseController {
    constructor(private readonly pauses: PauseService) {}

    @Get()
    public async list(@TenantId() restaurantId: string, @Query() q: ListPausesQueryDTO) {
        return PauseListResponseDTO.from(await this.pauses.list(restaurantId, q.page));
    }

    @Post()
    public async create(
        @TenantId() restaurantId: string,
        @Body() dto: CreatePauseDTO,
        @CurrentUser() actor: JwtUser
    ) {
        return PauseResponseDTO.from(await this.pauses.create(restaurantId, dto, actor));
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @Post(':id/end')
    public end(
        @TenantId() restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser
    ) {
        return this.pauses.end(restaurantId, id, actor);
    }
}
