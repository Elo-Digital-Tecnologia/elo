import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';
import { FIELD_RULES, isHHMM, RESTAURANT_LIST_STATUSES, type RestaurantListStatus } from '@elo/core';
import { Field, Present } from '../common/validation';

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
  @Field(FIELD_RULES.restaurantName) name: string;
  @Field(FIELD_RULES.slug, { optional: true }) slug?: string;
  @Field(FIELD_RULES.personName) managerName: string;
  @Field(FIELD_RULES.contact) managerContact: string;
  @IsUUID() planId: string;
  /** Free days, counted from the start of the first contract (0 = no trial). */
  @Field(FIELD_RULES.trialDays) trialDays: number;
  @Field(FIELD_RULES.serviceFeeBps, { optional: true }) serviceFeeBps?: number;
  @Field(FIELD_RULES.username) adminUsername: string;
  @Field(FIELD_RULES.password) adminPassword: string;
}

/** Dados editáveis pelo próprio restaurante. O slug não muda: está impresso nos QR Codes e gravado nas tags. */
export class UpdateSettingsDto {
  @Field(FIELD_RULES.restaurantName) name: string;
  @Field(FIELD_RULES.personName) managerName: string;
  @Field(FIELD_RULES.contact) managerContact: string;
  @Field(FIELD_RULES.serviceFeeBps) serviceFeeBps: number;
  @Present() @IsBoolean() guestFeeRefusal?: boolean;

  // Perfil público. Ausente = não muda; nulo ou texto vazio = limpa.
  @Field(FIELD_RULES.description, { optional: true }) description?: string | null;
  @Field(FIELD_RULES.imageUrl, { optional: true }) logoUrl?: string | null;
  @Field(FIELD_RULES.imageUrl, { optional: true }) coverUrl?: string | null;
  @Field(FIELD_RULES.address, { optional: true }) address?: string | null;
  @Field(FIELD_RULES.phone, { optional: true }) phone?: string | null;
  @Field(FIELD_RULES.instagram, { optional: true }) instagram?: string | null;
  @Field(FIELD_RULES.wifiName, { optional: true }) wifiName?: string | null;
  @Field(FIELD_RULES.wifiPassword, { optional: true }) wifiPassword?: string | null;
  /** Rebuilt as `{ open, close }` per day, so nothing else lands in the stored JSON. */
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((d) => (d && typeof d === 'object' ? { open: (d as { open?: unknown }).open, close: (d as { close?: unknown }).close } : d)) : value,
  )
  @IsOptional() @IsArray() @IsOpeningHours() openingHours?: ({ open: string; close: string } | null)[] | null;
}

export class EditRestaurantDto {
  @Field(FIELD_RULES.restaurantName, { optional: true }) name?: string;
  @Field(FIELD_RULES.personName, { optional: true }) managerName?: string;
  @Field(FIELD_RULES.contact, { optional: true }) managerContact?: string;
}

export class RestaurantListQuery {
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @IsIn(RESTAURANT_LIST_STATUSES) status?: RestaurantListStatus;
  /** Only restaurants whose payment is due within this many days. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90) dueWithin?: number;
  @IsOptional() @IsIn(['name', 'due', 'created']) sort?: 'name' | 'due' | 'created';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(100) pageSize?: number;
}

/** Deleting asks for the slug typed back, so a misclick cannot remove a restaurant. */
export class DeleteRestaurantDto {
  @IsString() @MaxLength(60) confirmSlug: string;
}

export class ChangeOwnerDto {
  @IsUUID() userId: string;
  @Field(FIELD_RULES.reason) reason: string;
}
