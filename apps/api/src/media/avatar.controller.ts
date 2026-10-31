import { BadRequestException, Controller, Delete, ForbiddenException, HttpCode, Param, ParseUUIDPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantManagerRoles } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { CurrentUser, NoImpersonation, Roles } from '../common/decorators';
import { StaffService } from '../staff/staff.service';
import { MAX_UPLOAD_BYTES, MediaService } from './media.service';

type Upload = { buffer: Buffer; originalname: string };
const upload = () => UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }));

/** Optional profile photos of the restaurant team: each member sets their own, leads set the team's. */
@ApiTags('staff')
@ApiBearerAuth()
@Controller()
export class AvatarController {
  constructor(
    private readonly media: MediaService,
    private readonly staff: StaffService,
  ) {}

  private async set(id: string, actor: JwtUser, file?: Upload) {
    if (!actor.restaurantId) throw new ForbiddenException();
    if (!file) throw new BadRequestException('file_required');
    const url = await this.media.saveAvatar(file.buffer);
    try {
      await this.media.dropAvatar(await this.staff.setAvatar(id, actor.restaurantId, actor, url));
    } catch (e) {
      await this.media.dropAvatar(url);
      throw e;
    }
    return { avatarUrl: url };
  }

  private async clear(id: string, actor: JwtUser) {
    if (!actor.restaurantId) throw new ForbiddenException();
    await this.media.dropAvatar(await this.staff.setAvatar(id, actor.restaurantId, actor, null));
  }

  @NoImpersonation()
  @Post('me/avatar')
  @upload()
  mine(@CurrentUser() actor: JwtUser, @UploadedFile() file?: Upload) {
    return this.set(actor.sub, actor, file);
  }

  @NoImpersonation()
  @HttpCode(204)
  @Delete('me/avatar')
  clearMine(@CurrentUser() actor: JwtUser) {
    return this.clear(actor.sub, actor);
  }

  @Roles(...RestaurantManagerRoles)
  @Post('staff/:id/avatar')
  @upload()
  member(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser, @UploadedFile() file?: Upload) {
    return this.set(id, actor, file);
  }

  @Roles(...RestaurantManagerRoles)
  @HttpCode(204)
  @Delete('staff/:id/avatar')
  clearMember(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser) {
    return this.clear(id, actor);
  }
}
