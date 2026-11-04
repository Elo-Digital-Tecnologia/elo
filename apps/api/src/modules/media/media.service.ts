import type { EnvConfig } from '#/config/env.js';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import { Like, Repository } from 'typeorm';
import { FILE_NAME_MAX_LENGTH, MEDIA_URL_PATTERN } from '#/common/constants.js';
import { TenantRepository } from '#/common/database/tenant.repository.js';
import { ProductEntity } from '#/modules/catalog/entities/product.entity.js';
import { RestaurantEntity } from '#/modules/restaurants/entities/restaurant.entity.js';
import { MediaEntity } from './entities/media.entity.js';
import { ImageInUseException } from './exceptions/image-in-use.exception.js';
import { InvalidImageException } from './exceptions/invalid-image.exception.js';
import { MediaLimitException } from './exceptions/media-limit.exception.js';
import { MediaNotFoundException } from './exceptions/media-not-found.exception.js';
import { UnsupportedImageTypeException } from './exceptions/unsupported-image-type.exception.js';
import {
    AVATAR_IMAGE,
    IMAGE_MAX_INPUT_PIXELS,
    MEDIA_PER_RESTAURANT,
    MENU_IMAGE,
    MENU_THUMBNAIL
} from './media.constants.js';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ACCEPTED = new Set(['jpeg', 'png', 'webp']);

export interface MediaView {
    id: string;
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
    bytes: number;
    name: string;
}

const urlOf = (id: string) => `/api/media/${id}.webp`;
const view = (m: MediaEntity): MediaView => ({
    id: m.id,
    url: urlOf(m.id),
    thumbUrl: `/api/media/${m.id}-sm.webp`,
    width: m.width,
    height: m.height,
    bytes: m.bytes,
    name: m.originalName
});

/** Local image library: validates, shrinks and converts to WebP (main image and thumbnail). */
@Injectable()
export class MediaService implements OnModuleInit {
    public readonly dir: string;

    constructor(
        @InjectRepository(MediaEntity) private readonly media: Repository<MediaEntity>,
        @InjectRepository(ProductEntity)
        private readonly products: Repository<ProductEntity>,
        @InjectRepository(RestaurantEntity)
        private readonly restaurants: Repository<RestaurantEntity>,
        configService: ConfigService<EnvConfig, true>
    ) {
        this.dir = configService.getOrThrow('app.uploadDir', { infer: true });
    }

    public onModuleInit() {
        return mkdir(this.dir, { recursive: true }).then(() => undefined);
    }

    private repo(rid: string) {
        return new TenantRepository(this.media, rid);
    }

    public async list(rid: string): Promise<MediaView[]> {
        return (await this.repo(rid).find({}, { createdAt: 'DESC' })).map(view);
    }

    public async upload(
        rid: string,
        file: { buffer: Buffer; originalname: string }
    ): Promise<MediaView> {
        if (
            (await this.media.count({ where: { restaurantId: rid } })) >=
            MEDIA_PER_RESTAURANT
        )
            throw new MediaLimitException();
        let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
        try {
            // The format comes from the content, not from the extension or the type the browser sent.
            meta = await sharp(file.buffer, {
                limitInputPixels: IMAGE_MAX_INPUT_PIXELS
            }).metadata();
        } catch {
            throw new InvalidImageException();
        }
        if (!meta.format || !ACCEPTED.has(meta.format))
            throw new UnsupportedImageTypeException();

        const base = () =>
            sharp(file.buffer, { limitInputPixels: IMAGE_MAX_INPUT_PIXELS }).rotate();
        const [main, thumb] = await Promise.all([
            base()
                .resize({
                    width: MENU_IMAGE.size,
                    height: MENU_IMAGE.size,
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .webp({ quality: MENU_IMAGE.quality })
                .toBuffer({ resolveWithObject: true }),
            base()
                .resize({
                    width: MENU_THUMBNAIL.size,
                    height: MENU_THUMBNAIL.size,
                    fit: 'cover'
                })
                .webp({ quality: MENU_THUMBNAIL.quality })
                .toBuffer()
        ]);

        const row = await this.repo(rid).create({
            originalName: file.originalname.slice(0, FILE_NAME_MAX_LENGTH),
            width: main.info.width,
            height: main.info.height,
            bytes: main.data.length
        });
        await mkdir(this.dir, { recursive: true });
        await Promise.all([
            writeFile(path.join(this.dir, `${row.id}.webp`), main.data),
            writeFile(path.join(this.dir, `${row.id}-sm.webp`), thumb)
        ]);
        return view(row);
    }

    /** Square profile photo, kept apart from the restaurant's image bank. Returns its URL. */
    public async saveAvatar(buffer: Buffer): Promise<string> {
        try {
            const meta = await sharp(buffer, {
                limitInputPixels: IMAGE_MAX_INPUT_PIXELS
            }).metadata();
            if (!meta.format || !ACCEPTED.has(meta.format))
                throw new UnsupportedImageTypeException();
        } catch (e) {
            throw e instanceof BadRequestException ? e : new InvalidImageException();
        }
        const id = randomUUID();
        const data = await sharp(buffer, { limitInputPixels: IMAGE_MAX_INPUT_PIXELS })
            .rotate()
            .resize({ width: AVATAR_IMAGE.size, height: AVATAR_IMAGE.size, fit: 'cover' })
            .webp({ quality: AVATAR_IMAGE.quality })
            .toBuffer();
        await mkdir(this.dir, { recursive: true });
        await writeFile(path.join(this.dir, `${id}.webp`), data);
        return urlOf(id);
    }

    /** Deletes a profile photo file; unknown or foreign URLs are ignored. */
    public async dropAvatar(url: string | null | undefined): Promise<void> {
        const file = url?.match(MEDIA_URL_PATTERN)?.[1];
        if (file)
            await unlink(path.join(this.dir, `${file}.webp`)).catch(() => undefined);
    }

    public async remove(rid: string, id: string): Promise<void> {
        const repo = this.repo(rid);
        if (!(await repo.findOne({ id }))) throw new MediaNotFoundException();
        const inProducts = await this.products.count({
            where: { restaurantId: rid, imageUrl: Like(`%${id}%`) }
        });
        const inProfile = await this.restaurants.count({
            where: [
                { id: rid, logoUrl: Like(`%${id}%`) },
                { id: rid, coverUrl: Like(`%${id}%`) }
            ]
        });
        if (inProducts || inProfile) throw new ImageInUseException();
        await repo.remove({ id });
        await Promise.all(
            [`${id}.webp`, `${id}-sm.webp`].map((f) =>
                unlink(path.join(this.dir, f)).catch(() => undefined)
            )
        );
    }
}
