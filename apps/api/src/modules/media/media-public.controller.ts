import type { Response } from 'express';
import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '#/common/decorators/public.decorator.js';
import { MEDIA_CACHE_CONTROL, MEDIA_FILE_PATTERN } from './media.constants.js';
import { MediaService } from './media.service.js';
import path from 'node:path';

/** Image library files. Public like the menu; the name is a UUID. */
@ApiTags('media')
@Public()
@SkipThrottle()
@Controller('media')
export class MediaPublicController {
    constructor(private readonly media: MediaService) {}

    @Get(':file')
    public file(@Param('file') file: string, @Res() res: Response) {
        if (!MEDIA_FILE_PATTERN.test(file))
            return void res.status(HttpStatus.NOT_FOUND).end();
        res.set('Cache-Control', MEDIA_CACHE_CONTROL);
        res.sendFile(path.join(this.media.dir, file), (err) => {
            if (err && !res.headersSent) res.status(HttpStatus.NOT_FOUND).end();
        });
    }
}
