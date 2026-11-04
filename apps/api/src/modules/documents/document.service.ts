import type { DocumentView } from '@elo/core/billing/billing';
import type {
    OnApplicationBootstrap,
    OnApplicationShutdown,
    OnModuleInit
} from '@nestjs/common';
import type { JwtUser } from '#/common/types/jwt-user.type.js';
import type { EnvConfig } from '#/config/env.js';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DOCUMENT_LIMITS } from '@elo/core/billing/billing';
import sharp from 'sharp';
import { Repository } from 'typeorm';
import { FILE_NAME_MAX_LENGTH } from '#/common/constants.js';
import { AuditLogService } from '#/modules/audit-logs/audit-log.service.js';
import {
    DOCUMENT_IMAGE_QUALITY,
    DOCUMENT_MAX_INPUT_PIXELS,
    DOCUMENT_UNUSED_HOURS
} from './document.constants.js';
import { DocumentEntity } from './entities/document.entity.js';
import { DocumentNotFoundException } from './exceptions/document-not-found.exception.js';
import { FileTooLargeException } from './exceptions/file-too-large.exception.js';
import { InvalidDocumentException } from './exceptions/invalid-document.exception.js';
import { UnsupportedDocumentException } from './exceptions/unsupported-document.exception.js';
import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type DocumentKind = DocumentEntity['kind'];

const IMAGE_TYPES: Record<string, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
};
/** An upload nobody attached to a payment or contract within this time is dropped. */

export const documentView = (d: DocumentEntity): DocumentView => ({
    id: d.id,
    kind: d.kind,
    name: d.originalName,
    mime: d.mime,
    bytes: d.bytes,
    createdAt: d.createdAt.toISOString()
});

/**
 * Private files of the Elo team: proofs of payment and signed contracts. The type
 * is read from the content (PDF signature or image decoder), photos lose their
 * metadata, and files live outside the public media folder.
 */
@Injectable()
export class DocumentService
    implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown
{
    private readonly log = new Logger(DocumentService.name);
    private readonly dir: string;
    private timer?: ReturnType<typeof setInterval>;

    constructor(
        @InjectRepository(DocumentEntity)
        private readonly docs: Repository<DocumentEntity>,
        private readonly audit: AuditLogService,
        configService: ConfigService<EnvConfig, true>
    ) {
        this.dir = path.join(
            configService.getOrThrow('app.uploadDir', { infer: true }),
            'private'
        );
    }

    public onModuleInit() {
        return mkdir(this.dir, { recursive: true }).then(() => undefined);
    }

    public onApplicationBootstrap() {
        this.timer = setInterval(() => void this.dropUnused(), 3_600_000);
        this.timer.unref();
    }

    public onApplicationShutdown() {
        clearInterval(this.timer);
    }

    public async upload(
        restaurantId: string,
        kind: DocumentKind,
        file: { buffer: Buffer; originalname: string },
        actor: JwtUser
    ): Promise<DocumentView> {
        if (file.buffer.length > DOCUMENT_LIMITS.maxBytes)
            throw new FileTooLargeException();
        const { data, mime } = await this.clean(file.buffer);
        const who = await this.audit.who(actor);
        const row = await this.docs.save(
            this.docs.create({
                restaurantId,
                kind,
                originalName:
                    file.originalname
                        .replace(/[\r\n"\\/]/g, '')
                        .slice(0, FILE_NAME_MAX_LENGTH) || 'arquivo',
                mime,
                bytes: data.length,
                sha256: createHash('sha256').update(data).digest('hex'),
                uploadedBy: who.id,
                uploadedByName: who.name
            })
        );
        await mkdir(this.dir, { recursive: true });
        await writeFile(path.join(this.dir, row.id), data);
        return documentView(row);
    }

    /** PDFs are kept as sent; photos are re-encoded in their own format, which drops EXIF (location, device). */
    private async clean(buffer: Buffer): Promise<{ data: Buffer; mime: string }> {
        if (buffer.subarray(0, 5).toString('latin1') === '%PDF-')
            return { data: buffer, mime: 'application/pdf' };
        let format: string | undefined;
        try {
            format = (
                await sharp(buffer, {
                    limitInputPixels: DOCUMENT_MAX_INPUT_PIXELS
                }).metadata()
            ).format;
        } catch {
            throw new UnsupportedDocumentException();
        }
        const mime = format ? IMAGE_TYPES[format] : undefined;
        if (!mime) throw new UnsupportedDocumentException();
        const image = sharp(buffer, {
            limitInputPixels: DOCUMENT_MAX_INPUT_PIXELS
        }).rotate();
        const data =
            format === 'png'
                ? await image.png().toBuffer()
                : format === 'webp'
                  ? await image.webp({ quality: DOCUMENT_IMAGE_QUALITY }).toBuffer()
                  : await image.jpeg({ quality: DOCUMENT_IMAGE_QUALITY }).toBuffer();
        return { data, mime };
    }

    /** A document of this restaurant and kind, or 400 when it belongs elsewhere. */
    public async owned(
        restaurantId: string,
        id: string,
        kind: DocumentKind
    ): Promise<DocumentEntity> {
        const doc = await this.docs.findOne({ where: { id, restaurantId, kind } });
        if (!doc)
            throw new InvalidDocumentException(
                kind === 'receipt' ? 'receiptId' : 'documentId'
            );
        return doc;
    }

    public async file(id: string): Promise<{ doc: DocumentEntity; data: Buffer }> {
        const doc = await this.docs.findOne({ where: { id } });
        if (!doc) throw new DocumentNotFoundException();
        const data = await readFile(path.join(this.dir, doc.id)).catch(() => null);
        if (!data) throw new DocumentNotFoundException();
        return { doc, data };
    }

    /** Erases the files of a restaurant being purged (the rows go with the restaurant). */
    public async dropFiles(ids: string[]): Promise<void> {
        await Promise.all(
            ids.map((id) => unlink(path.join(this.dir, id)).catch(() => undefined))
        );
    }

    /** Uploads never attached to a payment or contract. */
    public async dropUnused(): Promise<number> {
        try {
            const stale: { id: string }[] = await this.docs.query(
                `SELECT d.id FROM documents d
         WHERE d.created_at < now() - make_interval(hours => $1)
           AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.receipt_id = d.id)
           AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.document_id = d.id)`,
                [DOCUMENT_UNUSED_HOURS]
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
