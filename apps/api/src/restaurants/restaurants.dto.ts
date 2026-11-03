import type { RestaurantListStatus } from '@elo/core';
import type { ValidationOptions } from 'class-validator';
import { FIELD_RULES, RESTAURANT_LIST_STATUSES, hoursProblems } from '@elo/core';
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
    registerDecorator
} from 'class-validator';
import { Field, Present } from '../common/validation';

/** Seven days (Sunday to Saturday), each a list of shifts `{ open, close }` as "HH:MM"; the rules live in `hoursProblems`. */
function IsOpeningHours(options?: ValidationOptions) {
    return (target: object, property: string) =>
        registerDecorator({
            name: 'isOpeningHours',
            target: target.constructor,
            propertyName: property,
            options,
            validator: {
                validate: (v: unknown) => hoursProblems(v).length === 0,
                defaultMessage: (args) => {
                    const [first] = hoursProblems(args?.value);
                    return `openingHours is invalid: ${first?.code ?? 'unknown'}${first?.day != null ? ` on day ${first.day}` : ''}`;
                }
            }
        });
}

export class CreateRestaurantDto {
    @Field(FIELD_RULES.restaurantName) name: string;
    @Field(FIELD_RULES.slug, { optional: true }) slug?: string;
    @Field(FIELD_RULES.personName) managerName: string;
    @Field(FIELD_RULES.contact) managerContact: string;
    /** Optional: the plan comes with the contract; this one is only its starting suggestion. */
    @IsOptional() @IsUUID() planId?: string;
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
    @Field(FIELD_RULES.googleReviewUrl, { optional: true }) googleReviewUrl?:
        string | null;
    @Field(FIELD_RULES.wifiName, { optional: true }) wifiName?: string | null;
    @Field(FIELD_RULES.wifiPassword, { optional: true }) wifiPassword?: string | null;
    /** Rebuilt as `{ open, close }` per shift, so nothing else lands in the stored JSON. */
    @Transform(({ value }) =>
        Array.isArray(value)
            ? value.map((day) =>
                  Array.isArray(day)
                      ? day.map((s) =>
                            s && typeof s === 'object'
                                ? {
                                      open: (s as { open?: unknown }).open,
                                      close: (s as { close?: unknown }).close
                                  }
                                : s
                        )
                      : day
              )
            : value
    )
    @IsOptional()
    @IsArray()
    @IsOpeningHours()
    openingHours?: { open: string; close: string }[][] | null;
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
export class ChangeSlugDto {
    @Field(FIELD_RULES.slug) slug: string;
    @Field(FIELD_RULES.reason) reason: string;
}

export class DeleteRestaurantDto {
    @IsString() @MaxLength(60) confirmSlug: string;
}

export class ChangeOwnerDto {
    @IsUUID() userId: string;
    @Field(FIELD_RULES.reason) reason: string;
}
