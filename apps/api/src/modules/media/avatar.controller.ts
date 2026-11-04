import type { JwtUser } from '#/common/types/jwt-user.type.js';
import {
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles } from '@elo/core/roles/roles';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { NoImpersonation } from '#/common/decorators/no-impersonation.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { AccessDeniedException } from '#/common/exceptions/access-denied.exception.js';
import { FileRequiredException } from '#/common/exceptions/file-required.exception.js';
import { StaffService } from '#/modules/staff/staff.service.js';
import { AvatarResponseDTO } from './dto/avatar-response.dto.js';
import { MAX_UPLOAD_BYTES } from './media.constants.js';
import { MediaService } from './media.service.js';

type Upload = { buffer: Buffer; originalname: string };
const upload = () =>
    UseInterceptors(
        FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } })
    );

/** Optional profile photos of the restaurant team: each member sets their own, leads set the team's. */
@ApiTags('staff')
@ApiBearerAuth()
@Controller()
export class AvatarController {
    constructor(
        private readonly media: MediaService,
        private readonly staff: StaffService
    ) {}

    private async set(id: string, actor: JwtUser, file?: Upload) {
        if (!actor.restaurantId) throw new AccessDeniedException();
        if (!file) throw new FileRequiredException();
        const url = await this.media.saveAvatar(file.buffer);
        try {
            await this.media.dropAvatar(
                await this.staff.setAvatar(id, actor.restaurantId, actor, url)
            );
        } catch (e) {
            await this.media.dropAvatar(url);
            throw e;
        }
        return { avatarUrl: url };
    }

    private async clear(id: string, actor: JwtUser) {
        if (!actor.restaurantId) throw new AccessDeniedException();
        await this.media.dropAvatar(
            await this.staff.setAvatar(id, actor.restaurantId, actor, null)
        );
    }

    @NoImpersonation()
    @Post('me/avatar')
    @upload()
    public async mine(@CurrentUser() actor: JwtUser, @UploadedFile() file?: Upload) {
        return AvatarResponseDTO.from(await this.set(actor.sub, actor, file));
    }

    @NoImpersonation()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('me/avatar')
    public clearMine(@CurrentUser() actor: JwtUser) {
        return this.clear(actor.sub, actor);
    }

    @Roles(...RestaurantManagerRoles)
    @Post('staff/:id/avatar')
    @upload()
    public async member(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser,
        @UploadedFile() file?: Upload
    ) {
        return AvatarResponseDTO.from(await this.set(id, actor, file));
    }

    @Roles(...RestaurantManagerRoles)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('staff/:id/avatar')
    public clearMember(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() actor: JwtUser
    ) {
        return this.clear(id, actor);
    }
}
