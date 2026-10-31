import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import * as path from 'path';
import sharp from 'sharp';
import { Like, Repository } from 'typeorm';
import { TenantRepo } from '../common/tenant-repo';
import type { Env } from '../config/env';
import { Media, Product } from '../database/entities';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
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
const view = (m: Media): MediaView => ({
  id: m.id,
  url: urlOf(m.id),
  thumbUrl: `/api/media/${m.id}-sm.webp`,
  width: m.width,
  height: m.height,
  bytes: m.bytes,
  name: m.originalName,
});

/** Banco de imagens local: valida, reduz e converte para WebP (principal e miniatura). */
@Injectable()
export class MediaService implements OnModuleInit {
  readonly dir: string;

  constructor(
    @InjectRepository(Media) private readonly media: Repository<Media>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    config: ConfigService<Env, true>,
  ) {
    this.dir = config.get('UPLOAD_DIR', { infer: true });
  }

  onModuleInit() {
    return mkdir(this.dir, { recursive: true }).then(() => undefined);
  }

  private repo(rid: string) {
    return new TenantRepo(this.media, rid);
  }

  async list(rid: string): Promise<MediaView[]> {
    return (await this.repo(rid).find({}, { createdAt: 'DESC' })).map(view);
  }

  async upload(rid: string, file: { buffer: Buffer; originalname: string }): Promise<MediaView> {
    let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
    try {
      // O formato vem do conteúdo, não da extensão nem do tipo informado pelo navegador.
      meta = await sharp(file.buffer, { limitInputPixels: 40_000_000 }).metadata();
    } catch {
      throw new BadRequestException('invalid_image');
    }
    if (!meta.format || !ACCEPTED.has(meta.format)) throw new BadRequestException('unsupported_image_type');

    const base = () => sharp(file.buffer, { limitInputPixels: 40_000_000 }).rotate();
    const [main, thumb] = await Promise.all([
      base().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true }),
      base().resize({ width: 400, height: 400, fit: 'cover' }).webp({ quality: 75 }).toBuffer(),
    ]);

    const row = await this.repo(rid).create({
      originalName: file.originalname.slice(0, 120),
      width: main.info.width,
      height: main.info.height,
      bytes: main.data.length,
    });
    await mkdir(this.dir, { recursive: true });
    await Promise.all([
      writeFile(path.join(this.dir, `${row.id}.webp`), main.data),
      writeFile(path.join(this.dir, `${row.id}-sm.webp`), thumb),
    ]);
    return view(row);
  }

  /** Square profile photo, kept apart from the restaurant's image bank. Returns its URL. */
  async saveAvatar(buffer: Buffer): Promise<string> {
    try {
      const meta = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata();
      if (!meta.format || !ACCEPTED.has(meta.format)) throw new BadRequestException('unsupported_image_type');
    } catch (e) {
      throw e instanceof BadRequestException ? e : new BadRequestException('invalid_image');
    }
    const id = randomUUID();
    const data = await sharp(buffer, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 256, height: 256, fit: 'cover' }).webp({ quality: 80 }).toBuffer();
    await mkdir(this.dir, { recursive: true });
    await writeFile(path.join(this.dir, `${id}.webp`), data);
    return urlOf(id);
  }

  /** Deletes a profile photo file; unknown or foreign URLs are ignored. */
  async dropAvatar(url: string | null | undefined): Promise<void> {
    const file = url?.match(/^\/api\/media\/([0-9a-f-]{36})\.webp$/)?.[1];
    if (file) await unlink(path.join(this.dir, `${file}.webp`)).catch(() => undefined);
  }

  async remove(rid: string, id: string): Promise<void> {
    const repo = this.repo(rid);
    if (!(await repo.findOne({ id }))) throw new NotFoundException();
    if (await this.products.count({ where: { restaurantId: rid, imageUrl: Like(`%${id}%`) } })) {
      throw new ConflictException('image_in_use');
    }
    await repo.remove({ id });
    await Promise.all([`${id}.webp`, `${id}-sm.webp`].map((f) => unlink(path.join(this.dir, f)).catch(() => undefined)));
  }
}
