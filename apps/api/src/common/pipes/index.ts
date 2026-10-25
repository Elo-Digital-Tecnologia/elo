// Common Pipes — Elo Digital API

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zod validation pipe
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Dados de entrada inválidos',
          details: messages
        });
      }
      throw new BadRequestException('Dados de entrada inválidos');
    }
  }
}

/**
 * Parse integer pipe with validation
 */
@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException(`${metadata.data} deve ser um número inteiro`);
    }
    return val;
  }
}

/**
 * Parse boolean pipe
 */
@Injectable()
export class ParseBooleanPipe implements PipeTransform<string, boolean> {
  transform(value: string, metadata: ArgumentMetadata): boolean {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    throw new BadRequestException(`${metadata.data} deve ser um valor booleano`);
  }
}

/**
 * Parse UUID pipe
 */
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new BadRequestException(`${metadata.data} deve ser um UUID válido`);
    }
    return value;
  }
}

/**
 * Parse date pipe
 */
@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string, metadata: ArgumentMetadata): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`${metadata.data} deve ser uma data válida (ISO 8601)`);
    }
    return date;
  }
}

/**
 * Trim strings pipe
 */
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'object' && value !== null) {
      return this.trimObject(value);
    }
    return value;
  }

  private trimObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string') {
        result[key] = val.trim();
      } else if (typeof val === 'object' && val !== null) {
        result[key] = this.trimObject(val as Record<string, unknown>);
      } else {
        result[key] = val;
      }
    }
    return result;
  }
}

/**
 * File size validation pipe
 */
@Injectable()
export class MaxFileSizePipe implements PipeTransform {
  constructor(
    private readonly maxSize: number,
    private readonly allowedTypes: string[] = []
  ) {}

  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    if (!file) return file;

    if (file.size > this.maxSize) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `Arquivo excede o tamanho máximo de ${this.formatBytes(this.maxSize)}`
      });
    }

    if (this.allowedTypes.length > 0 && !this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        code: 'INVALID_FILE_TYPE',
        message: `Tipo de arquivo não permitido. Permitidos: ${this.allowedTypes.join(', ')}`
      });
    }

    return file;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Custom validation pipe factory
 */
export function createZodPipe(schema: ZodSchema) {
  return new ZodValidationPipe(schema);
}