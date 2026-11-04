import type { JwtUser } from '#/common/types/jwt-user.type.js';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@elo/core/roles/permissions';
import { Role } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { RequirePermission } from '#/common/decorators/require-permission.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { ContractService } from './contract.service.js';
import { ContractResponseDTO } from './dto/contract-response.dto.js';
import { ContractDTO } from './dto/contract.dto.js';
import { ReasonDTO } from './dto/reason.dto.js';

@ApiTags('contracts')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN, Role.ELO_ADMIN)
@Controller('admin/restaurants/:id')
export class ContractController {
    constructor(private readonly contracts: ContractService) {}

    @RequirePermission(Permission.RESTAURANTS_VIEW)
    @Get('contracts')
    public async list(@Param('id', ParseUUIDPipe) id: string) {
        return (await this.contracts.list(id)).map((item) =>
            ContractResponseDTO.from(item)
        );
    }

    @RequirePermission(Permission.CONTRACTS_MANAGE)
    @Post('contracts')
    public async register(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ContractDTO,
        @CurrentUser() user: JwtUser
    ) {
        return ContractResponseDTO.from(await this.contracts.register(id, dto, user));
    }

    /** Voids the latest contract, registered by mistake; it stays in the history. */
    @RequirePermission(Permission.CONTRACTS_MANAGE)
    @Post('contracts/:contractId/void')
    public async void(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('contractId', ParseUUIDPipe) contractId: string,
        @Body() dto: ReasonDTO,
        @CurrentUser() user: JwtUser
    ) {
        return ContractResponseDTO.from(
            await this.contracts.void(id, contractId, dto.reason, user)
        );
    }

    /** Ends the pilot's free trial today (billing starts, with the grace days). */
    @RequirePermission(Permission.PAYMENTS_RECORD)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Post('trial/end')
    public endTrial(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ReasonDTO,
        @CurrentUser() user: JwtUser
    ) {
        return this.contracts.endTrial(id, dto.reason, user);
    }
}
