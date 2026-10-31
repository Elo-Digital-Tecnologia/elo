import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import * as path from 'path';
import { RestaurantManagerRoles } from '@elo/core';
import { Public, Roles, TenantId } from '../common/decorators';
import { MAX_UPLOAD_BYTES, MediaService } from './media.service';

/** Gestão do banco de imagens do restaurante (só o administrador). */
@ApiTags('media')
@ApiBearerAuth()
@Roles(...RestaurantManagerRoles)
@Controller('catalog/media')
export class MediaAdminController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@TenantId() rid: string) {
    return this.media.list(rid);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  upload(@TenantId() rid: string, @UploadedFile() file?: { buffer: Buffer; originalname: string }) {
    if (!file) throw new BadRequestException('file_required');
    return this.media.upload(rid, file);
  }

  @HttpCode(204)
  @Delete(':id')
  remove(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.media.remove(rid, id);
  }
}

/** Arquivos do banco de imagens. Públicos como o cardápio; o nome é um UUID. */
@ApiTags('media')
@Public()
@SkipThrottle()
@Controller('media')
export class MediaPublicController {
  constructor(private readonly media: MediaService) {}

  @Get(':file')
  file(@Param('file') file: string, @Res() res: Response) {
    if (!/^[0-9a-f-]{36}(-sm)?\.webp$/.test(file)) return void res.status(404).end();
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(path.join(this.media.dir, file), (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }
}
