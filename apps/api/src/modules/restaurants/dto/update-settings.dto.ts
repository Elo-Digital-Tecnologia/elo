import { FIELD_RULES } from '@elo/core/fields/field-rules';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional } from 'class-validator';
import { Field } from '#/common/decorators/field.decorator.js';
import { Present } from '#/common/decorators/present.decorator.js';
import { IsOpeningHours } from '../decorators/is-opening-hours.decorator.js';

/** Data the restaurant edits itself. The slug never changes: it is printed on QR codes and written on tags. */
export class UpdateSettingsDTO {
    @Field(FIELD_RULES.restaurantName)
    public name: string;

    @Field(FIELD_RULES.personName)
    public managerName: string;

    @Field(FIELD_RULES.contact)
    public managerContact: string;

    @Field(FIELD_RULES.serviceFeeBps)
    public serviceFeeBps: number;

    @Present()
    @IsBoolean()
    public guestFeeRefusal?: boolean;

    // Public profile. Missing = unchanged; null or empty text = cleared.
    @Field(FIELD_RULES.description, { optional: true })
    public description?: string | null;

    @Field(FIELD_RULES.imageUrl, { optional: true })
    public logoUrl?: string | null;

    @Field(FIELD_RULES.imageUrl, { optional: true })
    public coverUrl?: string | null;

    @Field(FIELD_RULES.address, { optional: true })
    public address?: string | null;

    @Field(FIELD_RULES.phone, { optional: true })
    public phone?: string | null;

    @Field(FIELD_RULES.instagram, { optional: true })
    public instagram?: string | null;

    @Field(FIELD_RULES.googleReviewUrl, { optional: true })
    public googleReviewUrl?: string | null;

    @Field(FIELD_RULES.wifiName, { optional: true })
    public wifiName?: string | null;

    @Field(FIELD_RULES.wifiPassword, { optional: true })
    public wifiPassword?: string | null;

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
    public openingHours?: { open: string; close: string }[][] | null;
}
