import type { Response } from 'express';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { DocumentKind } from './document.service.js';
import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Res,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DOCUMENT_LIMITS } from '@elo/core/billing/billing';
import { Permission } from '@elo/core/roles/permissions';
import { Role } from '@elo/core/roles/roles';
import { RATE_LIMITS } from '#/common/constants.js';
import { CurrentUser } from '#/common/decorators/current-user.decorator.js';
import { RequirePermission } from '#/common/decorators/require-permission.decorator.js';
import { Roles } from '#/common/decorators/roles.decorator.js';
import { AccessDeniedException } from '#/common/exceptions/access-denied.exception.js';
import { FileRequiredException } from '#/common/exceptions/file-required.exception.js';
import { RestaurantService } from '#/modules/restaurants/restaurant.service.js';
import { DocumentService } from './document.service.js';
import { DocumentResponseDTO } from './dto/document-response.dto.js';
import { UploadDocumentDTO } from './dto/upload-document.dto.js';

/** Who may send and who may read each kind of document. */
const WRITE: Record<DocumentKind, Permission> = {
    receipt: Permission.PAYMENTS_RECORD,
    contract: Permission.CONTRACTS_MANAGE
};
const READ: Record<DocumentKind, Permission> = {
    receipt: Permission.PAYMENTS_VIEW,
    contract: Permission.RESTAURANTS_VIEW
};

const allowed = (user: JwtUser, p: Permission) =>
    user.roles.includes(Role.SUPERADMIN) || user.permissions.includes(p);

@ApiTags('documents')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN, Role.ELO_ADMIN)
@RequirePermission(Permission.RESTAURANTS_VIEW)
@Controller('admin')
export class DocumentController {
    constructor(
        private readonly documents: DocumentService,
        private readonly restaurants: RestaurantService
    ) {}

    @Throttle(RATE_LIMITS.DOCUMENT_UPLOAD)
    @Post('restaurants/:id/documents')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: DOCUMENT_LIMITS.maxBytes, files: 1 }
        })
    )
    public async upload(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
        @CurrentUser() user: JwtUser,
        @Body() dto: UploadDocumentDTO
    ) {
        if (!allowed(user, WRITE[dto.kind])) throw new AccessDeniedException();
        if (!file) throw new FileRequiredException();
        await this.restaurants.get(id);
        return DocumentResponseDTO.from(
            await this.documents.upload(id, dto.kind, file, user)
        );
    }

    /** Opens the file in the browser; never cached by shared caches, never run as a page. */
    @Get('documents/:id')
    public async open(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtUser,
        @Res() res: Response
    ) {
        const { doc, data } = await this.documents.file(id);
        if (!allowed(user, READ[doc.kind])) throw new AccessDeniedException();
        res.set({
            'Content-Type': doc.mime,
            'Content-Length': String(data.length),
            'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy':
                "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; object-src 'self'",
            'Cache-Control': 'private, no-store'
        });
        res.send(data);
    }
}
