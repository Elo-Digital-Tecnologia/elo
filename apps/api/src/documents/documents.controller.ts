import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsIn } from 'class-validator';
import type { Response } from 'express';
import { DOCUMENT_LIMITS, Permission, Role } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import { CurrentUser, RequirePermission, Roles } from '../common/decorators';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { type DocumentKind, DocumentsService } from './documents.service';

class UploadDocumentDto {
  @IsIn(['receipt', 'contract']) kind: DocumentKind;
}

/** Who may send and who may read each kind of document. */
const WRITE: Record<DocumentKind, Permission> = { receipt: Permission.PaymentsRecord, contract: Permission.RestaurantsEdit };
const READ: Record<DocumentKind, Permission> = { receipt: Permission.PaymentsView, contract: Permission.RestaurantsView };

const allowed = (user: JwtUser, p: Permission) => user.roles.includes(Role.Superadmin) || user.permissions.includes(p);

@ApiTags('documents')
@ApiBearerAuth()
@Roles(Role.Superadmin, Role.EloAdmin)
@RequirePermission(Permission.RestaurantsView)
@Controller('admin')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly restaurants: RestaurantsService,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('restaurants/:id/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: DOCUMENT_LIMITS.maxBytes, files: 1 } }))
  async upload(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @CurrentUser() user: JwtUser,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!allowed(user, WRITE[dto.kind])) throw new ForbiddenException();
    if (!file) throw new BadRequestException('file_required');
    await this.restaurants.get(id);
    return this.documents.upload(id, dto.kind, file, user);
  }

  /** Opens the file in the browser; never cached by shared caches, never run as a page. */
  @Get('documents/:id')
  async open(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser, @Res() res: Response) {
    const { doc, data } = await this.documents.file(id);
    if (!allowed(user, READ[doc.kind])) throw new ForbiddenException();
    res.set({
      'Content-Type': doc.mime,
      'Content-Length': String(data.length),
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; object-src 'self'",
      'Cache-Control': 'private, no-store',
    });
    res.send(data);
  }
}
