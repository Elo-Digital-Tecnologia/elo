import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';
import { brazilPhone, contact, instagramHandle, isHHMM, LIMITS, personName, RESTAURANT_LIST_STATUSES, type RestaurantListStatus, SLUG_PATTERN } from '@elo/core';
import { Normalized } from '../common/validation';
import { IMAGE_URL_PATTERN } from '../common/image-url';

/** Texto vazio vira nulo: é como o formulário limpa um campo. */
const emptyToNull = () => Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : typeof value === 'string' ? value.trim() : value));

/** Sete dias (domingo a sábado), cada um nulo (fechado) ou { open, close } em "HH:MM". */
function IsOpeningHours(options?: ValidationOptions) {
  return (target: object, property: string) =>
    registerDecorator({
      name: 'isOpeningHours',
      target: target.constructor,
      propertyName: property,
      options,
      validator: {
        validate: (v: unknown) =>
          Array.isArray(v) &&
          v.length === 7 &&
          v.every((d) => d === null || (typeof d === 'object' && d !== null && isHHMM((d as { open?: unknown }).open) && isHHMM((d as { close?: unknown }).close))),
        defaultMessage: () => 'openingHours must have 7 entries, each null or { open, close } as HH:MM',
      },
    });
}

export class CreateRestaurantDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsOptional() @Matches(SLUG_PATTERN) @MaxLength(60) slug?: string;
  @Normalized(personName, 'managerName must be a person name') managerName: string;
  @Normalized(contact, 'managerContact must be a Brazilian phone or an e-mail') managerContact: string;
  @Type(() => Date) @IsDate() dueDate: Date;
  @IsOptional() @IsInt() @Min(0) @Max(LIMITS.serviceFeeBpsMax) serviceFeeBps?: number;
  @IsString() @MinLength(3) @MaxLength(64) @Matches(/^[a-z0-9._-]+$/) adminUsername: string;
  @IsString() @MinLength(8) @MaxLength(128) adminPassword: string;
}

export class RecordPaymentDto {
  @IsInt() @Min(0) amountCents: number;
  @Type(() => Date) @IsDate() paidAt: Date;
  @Type(() => Date) @IsDate() newDueDate: Date;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Dados editáveis pelo próprio restaurante. O slug não muda: está impresso nos QR Codes e gravado nas tags. */
export class UpdateSettingsDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @Normalized(personName, 'managerName must be a person name') managerName: string;
  @Normalized(contact, 'managerContact must be a Brazilian phone or an e-mail') managerContact: string;
  @IsInt() @Min(0) @Max(LIMITS.serviceFeeBpsMax) serviceFeeBps: number;

  // Perfil público. Ausente = não muda; nulo ou texto vazio = limpa.
  @emptyToNull() @IsOptional() @IsString() @MaxLength(LIMITS.description) description?: string | null;
  @emptyToNull() @IsOptional() @Matches(IMAGE_URL_PATTERN) @MaxLength(500) logoUrl?: string | null;
  @emptyToNull() @IsOptional() @Matches(IMAGE_URL_PATTERN) @MaxLength(500) coverUrl?: string | null;
  @emptyToNull() @IsOptional() @IsString() @MaxLength(LIMITS.address) address?: string | null;
  @IsOptional() @Normalized(brazilPhone, 'phone must be a Brazilian phone with area code', { nullable: true }) phone?: string | null;
  @IsOptional() @Normalized(instagramHandle, 'instagram must be a profile name', { nullable: true }) instagram?: string | null;
  @emptyToNull() @IsOptional() @IsString() @MaxLength(LIMITS.wifiName) wifiName?: string | null;
  @emptyToNull() @IsOptional() @IsString() @MaxLength(LIMITS.wifiPassword) wifiPassword?: string | null;
  @IsOptional() @IsArray() @IsOpeningHours() openingHours?: ({ open: string; close: string } | null)[] | null;
}

export class EditRestaurantDto {
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @Normalized(personName, 'managerName must be a person name') managerName?: string;
  @IsOptional() @Normalized(contact, 'managerContact must be a Brazilian phone or an e-mail') managerContact?: string;
}

export class RestaurantListQuery {
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @IsIn(RESTAURANT_LIST_STATUSES) status?: RestaurantListStatus;
  /** Only restaurants whose payment is due within this many days. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90) dueWithin?: number;
  @IsOptional() @IsIn(['name', 'due', 'created']) sort?: 'name' | 'due' | 'created';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(100) pageSize?: number;
}

/** Deleting asks for the slug typed back, so a misclick cannot remove a restaurant. */
export class DeleteRestaurantDto {
  @IsString() @MaxLength(60) confirmSlug: string;
}
