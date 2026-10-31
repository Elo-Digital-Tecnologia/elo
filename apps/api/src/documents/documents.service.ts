import { BadRequestException, Injectable, Logger, NotFoundException, type OnApplicationBootstrap, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { Repository } from 'typeorm';
import { DOCUMENT_LIMITS, type DocumentView } from '@elo/core';
import type { JwtUser } from '../common/auth-types';
import type { Env } from '../config/env';
import { AuditService } from '../audit/audit.service';
import { Document } from '../database/entities';

export type DocumentKind = Document['kind'];

const IMAGE_TYPES: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
/** An upload nobody attached to a payment or contract within this time is dropped. */
const UNUSED_HOURS = 24;

export const documentView = (d: Document): DocumentView => ({
  id: d.id,
  kind: d.kind,
  name: d.originalName,
  mime: d.mime,
  bytes: d.bytes,
  createdAt: d.createdAt.toISOString(),
});

/**
 * Private files of the Elo team: proofs of payment and signed contracts. The type
 * is read from the content (PDF signature or image decoder), photos lose their
 * metadata, and files live outside the public media folder.
 */
@Injectable()
export class DocumentsService implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger(DocumentsService.name);
  private readonly dir: string;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(Document) private readonly docs: Repository<Document>,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.dir = path.join(config.get('UPLOAD_DIR', { infer: true }), 'private');
  }

  onModuleInit() {
    return mkdir(this.dir, { recursive: true }).then(() => undefined);
  }

  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.dropUnused(), 3_600_000);
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  async upload(restaurantId: string, kind: DocumentKind, file: { buffer: Buffer; originalname: string }, actor: JwtUser): Promise<DocumentView> {
    if (file.buffer.length > DOCUMENT_LIMITS.maxBytes) throw new BadRequestException('file_too_large');
    const { data, mime } = await this.clean(file.buffer);
    const who = await this.audit.who(actor);
    const row = await this.docs.save(
      this.docs.create({
        restaurantId,
        kind,
        originalName: file.originalname.replace(/[\r\n"\\/]/g, '').slice(0, 120) || 'arquivo',
        mime,
        bytes: data.length,
        sha256: createHash('sha256').update(data).digest('hex'),
        uploadedBy: who.id,
        uploadedByName: who.name,
      }),
    );
    await mkdir(this.dir, { recursive: true });
    await writeFile(path.join(this.dir, row.id), data);
    return documentView(row);
  }

  /** PDFs are kept as sent; photos are re-encoded in their own format, which drops EXIF (location, device). */
  private async clean(buffer: Buffer): Promise<{ data: Buffer; mime: string }> {
    if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return { data: buffer, mime: 'application/pdf' };
    let format: string | undefined;
    try {
      format = (await sharp(buffer, { limitInputPixels: 60_000_000 }).metadata()).format;
    } catch {
      throw new BadRequestException('unsupported_document');
    }
    const mime = format ? IMAGE_TYPES[format] : undefined;
    if (!mime) throw new BadRequestException('unsupported_document');
    const image = sharp(buffer, { limitInputPixels: 60_000_000 }).rotate();
    const data = format === 'png' ? await image.png().toBuffer() : format === 'webp' ? await image.webp({ quality: 90 }).toBuffer() : await image.jpeg({ quality: 90 }).toBuffer();
    return { data, mime };
  }

  /** A document of this restaurant and kind, or 400 when it belongs elsewhere. */
  async owned(restaurantId: string, id: string, kind: DocumentKind): Promise<Document> {
    const doc = await this.docs.findOne({ where: { id, restaurantId, kind } });
    if (!doc) throw new BadRequestException({ statusCode: 400, message: 'invalid_document', field: kind === 'receipt' ? 'receiptId' : 'documentId' });
    return doc;
  }

  async file(id: string): Promise<{ doc: Document; data: Buffer }> {
    const doc = await this.docs.findOne({ where: { id } });
    if (!doc) throw new NotFoundException();
    const data = await readFile(path.join(this.dir, doc.id)).catch(() => null);
    if (!data) throw new NotFoundException();
    return { doc, data };
  }

  /** Erases the files of a restaurant being purged (the rows go with the restaurant). */
  async dropFiles(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => unlink(path.join(this.dir, id)).catch(() => undefined)));
  }

  /** Uploads never attached to a payment or contract. */
  async dropUnused(): Promise<number> {
    try {
      const stale: { id: string }[] = await this.docs.query(
        `SELECT d.id FROM documents d
         WHERE d.created_at < now() - make_interval(hours => $1)
           AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.receipt_id = d.id)
           AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.document_id = d.id)`,
        [UNUSED_HOURS],
      );
      if (!stale.length) return 0;
      const ids = stale.map((r) => r.id);
      await this.docs.delete(ids);
      await this.dropFiles(ids);
      return ids.length;
    } catch (e) {
      this.log.error('Unused documents cleanup failed', e as Error);
      return 0;
    }
  }
}
