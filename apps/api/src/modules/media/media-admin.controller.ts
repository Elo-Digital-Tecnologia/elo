import {
    Controller,
    Delete,
    Get,
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
import { Roles } from '#/common/decorators/roles.decorator.js';
import { TenantId } from '#/common/decorators/tenant-id.decorator.js';
import { FileRequiredException } from '#/common/exceptions/file-required.exception.js';
import { MediaResponseDTO } from './dto/media-response.dto.js';
import { MAX_UPLOAD_BYTES } from './media.constants.js';
import { MediaService } from './media.service.js';

/** The restaurant's image library (managers only). */
@ApiTags('media')
@ApiBearerAuth()
@Roles(...RestaurantManagerRoles)
@Controller('catalog/media')
export class MediaAdminController {
    constructor(private readonly media: MediaService) {}

    @Get()
    public async list(@TenantId() rid: string) {
        return (await this.media.list(rid)).map((item) => MediaResponseDTO.from(item));
    }

    @Post()
    @UseInterceptors(
        FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } })
    )
    public async upload(
        @TenantId() rid: string,
        @UploadedFile() file?: { buffer: Buffer; originalname: string }
    ) {
        if (!file) throw new FileRequiredException();
        return MediaResponseDTO.from(await this.media.upload(rid, file));
    }

    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete(':id')
    public remove(@TenantId() rid: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.media.remove(rid, id);
    }
}
