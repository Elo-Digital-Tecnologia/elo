import { formatBRL, parseCents } from './money';
import { SLUG_PATTERN } from './slug';
import { brazilPhone, contact, email, instagramHandle, LIMITS, PERSON_NAME } from './validation';

/**
 * One rule per kind of field, shared by the API (DTO decorators) and the forms
 * (live validation), so both accept the same values and report the same,
 * single, specific reason when they do not.
 */

export type FieldErrorCode =
  | 'required'
  | 'too_short'
  | 'too_long'
  | 'invalid_type'
  | 'invalid_name'
  | 'invalid_username'
  | 'invalid_slug'
  | 'invalid_phone'
  | 'invalid_email'
  | 'invalid_contact'
  | 'invalid_instagram'
  | 'invalid_url'
  | 'invalid_money'
  | 'not_integer'
  | 'too_small'
  | 'too_large'
  | 'not_zero'
  | 'invalid_option'
  | 'invalid_date'
  | 'too_early'
  | 'too_late'
  | 'too_few'
  | 'too_many'
  | 'unknown_field'
  | 'invalid';

export interface FieldError {
  code: FieldErrorCode;
  params?: { min?: number; max?: number; money?: boolean; /** YYYY-MM-DD limit of a date field. */ date?: string };
}

export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: FieldError };

export interface FieldRule<T = unknown> {
  /** Accepts null/undefined/empty as "no value" (stored as null). */
  optional: boolean;
  /** Longest text accepted, for `maxLength` on inputs. */
  max?: number;
  check(raw: unknown): FieldResult<T | null>;
}

const ok = <T>(value: T): FieldResult<T> => ({ ok: true, value });
const fail = (code: FieldErrorCode, params?: FieldError['params']): FieldResult<never> => ({ ok: false, error: { code, params } });

interface TextOptions {
  min?: number;
  max: number;
  optional?: boolean;
  /** Passwords keep their spaces; everything else is trimmed and inner spaces collapsed. */
  raw?: boolean;
  lower?: boolean;
  pattern?: RegExp;
  patternCode?: FieldErrorCode;
  /** Turns the text into its stored form (a formatted phone), or null when it is not valid. */
  normalize?: (v: string) => string | null;
  normalizeCode?: FieldErrorCode;
}

function text(o: TextOptions): FieldRule<string> {
  return {
    optional: !!o.optional,
    max: o.max,
    check(input) {
      if (input === null || input === undefined) return o.optional ? ok(null) : fail('required');
      if (typeof input !== 'string') return fail('invalid_type');
      let v = o.raw ? input : input.trim().replace(/\s+/g, ' ');
      if (o.lower) v = v.toLowerCase();
      if (!v.trim()) return o.optional ? ok(null) : fail('required');
      if (o.min && v.length < o.min) return fail('too_short', { min: o.min });
      if (v.length > o.max) return fail('too_long', { max: o.max });
      if (o.pattern && !o.pattern.test(v)) return fail(o.patternCode ?? 'invalid');
      if (o.normalize) {
        const n = o.normalize(v);
        if (n === null) return fail(o.normalizeCode ?? 'invalid');
        v = n;
      }
      return ok(v);
    },
  };
}

interface IntOptions {
  min: number;
  max: number;
  optional?: boolean;
  /** Amounts in cents: messages show reais. */
  money?: boolean;
  nonZero?: boolean;
}

function int(o: IntOptions): FieldRule<number> {
  return {
    optional: !!o.optional,
    check(input) {
      if (input === null || input === undefined || input === '') return o.optional ? ok(null) : fail('required');
      if (typeof input !== 'number' || !Number.isInteger(input)) return fail(o.money ? 'invalid_money' : 'not_integer');
      if (o.nonZero && input === 0) return fail('not_zero');
      if (input < o.min) return fail('too_small', { min: o.min, money: o.money });
      if (input > o.max) return fail('too_large', { max: o.max, money: o.money });
      return ok(input);
    },
  };
}

/** Passwords are hashed with bcrypt, which ignores anything past 72 bytes (accents take 2). */
const PASSWORD_BYTES = 72;

function withBytes(base: FieldRule<string>, bytes: number): FieldRule<string> {
  return {
    ...base,
    check(input) {
      const r = base.check(input);
      if (r.ok && r.value !== null && new TextEncoder().encode(r.value).length > bytes) return fail('too_long', { max: base.max });
      return r;
    },
  };
}

/** Highest price, adjustment or plan amount the system accepts: R$ 10.000,00. */
export const MONEY_MAX_CENTS = 1_000_000;

export const FIELD_LIMITS = {
  username: { min: 3, max: 64 },
  password: { min: 8, max: 72 },
  displayName: 30,
  slug: 60,
  contact: 120,
  instagram: 60,
  categoryName: 80,
  productName: 120,
  productDescription: 500,
  optionName: 80,
  tableName: 40,
  orderNotes: 300,
  reason: { min: 3, max: 300 },
  reviewComment: 300,
  adjustmentLabel: { min: 2, max: 80 },
  adjustmentReason: 200,
  planName: { min: 2, max: 60 },
  paymentNote: 300,
  pauseReason: 120,
  imageUrl: 500,
  position: 10_000,
} as const;

const USERNAME = /^[a-z0-9._-]+$/;
/** An image from the restaurant's own bank, or any https address. */
const IMAGE_URL = /^(\/api\/media\/[0-9a-f-]{36}\.webp|https:\/\/[^\s<>"']+)$/;

export const FIELD_RULES = {
  personName: text({ min: LIMITS.personName.min, max: LIMITS.personName.max, pattern: PERSON_NAME, patternCode: 'invalid_name' }),
  displayName: text({ max: FIELD_LIMITS.displayName, optional: true, pattern: PERSON_NAME, patternCode: 'invalid_name' }),
  username: text({ ...FIELD_LIMITS.username, lower: true, pattern: USERNAME, patternCode: 'invalid_username' }),
  password: withBytes(text({ ...FIELD_LIMITS.password, raw: true }), PASSWORD_BYTES),
  restaurantName: text({ min: LIMITS.restaurantName.min, max: LIMITS.restaurantName.max }),
  slug: text({ min: 2, max: FIELD_LIMITS.slug, lower: true, pattern: SLUG_PATTERN, patternCode: 'invalid_slug' }),
  description: text({ max: LIMITS.description, optional: true }),
  address: text({ max: LIMITS.address, optional: true }),
  phone: text({ max: 30, optional: true, normalize: brazilPhone, normalizeCode: 'invalid_phone' }),
  instagram: text({ max: FIELD_LIMITS.instagram, optional: true, normalize: instagramHandle, normalizeCode: 'invalid_instagram' }),
  email: text({ max: 120, normalize: email, normalizeCode: 'invalid_email' }),
  contact: text({ max: FIELD_LIMITS.contact, normalize: contact, normalizeCode: 'invalid_contact' }),
  wifiName: text({ max: LIMITS.wifiName, optional: true }),
  wifiPassword: text({ max: LIMITS.wifiPassword, optional: true, raw: true }),
  categoryName: text({ min: 1, max: FIELD_LIMITS.categoryName }),
  productName: text({ min: 1, max: FIELD_LIMITS.productName }),
  productDescription: text({ max: FIELD_LIMITS.productDescription, optional: true }),
  optionName: text({ min: 1, max: FIELD_LIMITS.optionName }),
  tableName: text({ min: 1, max: FIELD_LIMITS.tableName }),
  orderNotes: text({ max: FIELD_LIMITS.orderNotes, optional: true }),
  reason: text({ ...FIELD_LIMITS.reason }),
  optionalReason: text({ max: FIELD_LIMITS.reason.max, optional: true }),
  reviewComment: text({ max: FIELD_LIMITS.reviewComment, optional: true }),
  adjustmentLabel: text({ ...FIELD_LIMITS.adjustmentLabel }),
  adjustmentReason: text({ max: FIELD_LIMITS.adjustmentReason, optional: true }),
  planName: text({ ...FIELD_LIMITS.planName }),
  signatoryRole: text({ min: 2, max: 80 }),
  paymentNote: text({ max: FIELD_LIMITS.paymentNote, optional: true }),
  pauseReason: text({ max: FIELD_LIMITS.pauseReason, optional: true }),
  imageUrl: text({ max: FIELD_LIMITS.imageUrl, optional: true, raw: true, pattern: IMAGE_URL, patternCode: 'invalid_url' }),
  priceCents: int({ min: 0, max: MONEY_MAX_CENTS, money: true }),
  planPriceCents: int({ min: 1, max: MONEY_MAX_CENTS, money: true }),
  paymentCents: int({ min: 1, max: MONEY_MAX_CENTS * 10, money: true }),
  adjustmentCents: int({ min: -MONEY_MAX_CENTS, max: MONEY_MAX_CENTS, money: true, nonZero: true }),
  serviceFeeBps: int({ min: 0, max: LIMITS.serviceFeeBpsMax }),
  position: int({ min: 0, max: FIELD_LIMITS.position }),
  /** Free days before the first due date, counted from the start of the first contract. */
  trialDays: int({ min: 0, max: 90 }),
} satisfies Record<string, FieldRule>;

export type FieldRuleName = keyof typeof FIELD_RULES;

/** The first problem with a value, or null when it is fine. */
export function fieldError(rule: FieldRule, value: unknown): FieldError | null {
  const r = rule.check(value);
  return r.ok ? null : r.error;
}

/**
 * A calendar day typed in a form (YYYY-MM-DD when complete; anything else is
 * what was typed) checked against optional first and last allowed days.
 */
export function dayError(value: string, o: { min?: string; max?: string; optional?: boolean } = {}): FieldError | null {
  if (!value.trim()) return o.optional ? null : { code: 'required' };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = new Date(`${value}T12:00:00Z`);
  const real = !!m && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  if (!real) return { code: 'invalid_date' };
  if (o.min && value < o.min) return { code: 'too_early', params: { date: o.min } };
  if (o.max && value > o.max) return { code: 'too_late', params: { date: o.max } };
  return null;
}

/** Money typed in a form ("39,90") checked with a cents rule; empty follows the rule's `optional`. */
export function moneyError(rule: FieldRule, typed: string): FieldError | null {
  if (!typed.trim()) return rule.optional ? null : { code: 'required' };
  const negative = typed.trim().startsWith('-');
  const cents = parseCents(typed.replace(/^\s*-/, ''));
  if (cents === null) return { code: 'invalid_money' };
  return fieldError(rule, negative ? -cents : cents);
}

const brDay = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

const amount = (n: number | undefined, money?: boolean) => (n === undefined ? '' : money ? formatBRL(n) : n.toLocaleString('pt-BR'));

/** The sentence shown under the field, in Brazilian Portuguese. */
export function fieldMessage(error: FieldError): string {
  const p = error.params ?? {};
  switch (error.code) {
    case 'required':
      return 'Preencha este campo.';
    case 'too_short':
      return `Use pelo menos ${p.min} ${p.min === 1 ? 'caractere' : 'caracteres'}.`;
    case 'too_long':
      return `Use no máximo ${p.max} caracteres.`;
    case 'invalid_name':
      return 'Use só letras, espaços, apóstrofo, ponto ou hífen, começando por uma letra.';
    case 'invalid_username':
      return 'Use só letras minúsculas, números, ponto, hífen ou sublinhado, sem espaços.';
    case 'invalid_slug':
      return 'Use só letras minúsculas e números, com hífen entre as palavras.';
    case 'invalid_phone':
      return 'Informe um telefone com DDD, como (11) 91234-5678.';
    case 'invalid_email':
      return 'Informe um e-mail válido, como nome@exemplo.com.';
    case 'invalid_contact':
      return 'Informe um telefone com DDD ou um e-mail válido.';
    case 'invalid_instagram':
      return 'Informe o usuário do Instagram, como @restaurante.';
    case 'invalid_url':
      return 'Use um endereço de imagem que comece com https://.';
    case 'invalid_money':
      return 'Informe um valor como 39,90.';
    case 'not_integer':
      return 'Informe um número inteiro.';
    case 'too_small':
      return `O mínimo é ${amount(p.min, p.money)}.`;
    case 'too_large':
      return `O máximo é ${amount(p.max, p.money)}.`;
    case 'not_zero':
      return 'O valor não pode ser zero.';
    case 'invalid_option':
      return 'Escolha uma das opções da lista.';
    case 'invalid_date':
      return 'Informe uma data válida, no formato dd/mm/aaaa.';
    case 'too_early':
      return `Use uma data a partir de ${brDay(p.date)}.`;
    case 'too_late':
      return `Use uma data até ${brDay(p.date)}.`;
    case 'too_few':
      return p.min === 1 ? 'Inclua pelo menos um item.' : `Inclua pelo menos ${p.min} itens.`;
    case 'too_many':
      return `Inclua no máximo ${p.max} itens.`;
    case 'unknown_field':
      return 'Este campo não é aceito aqui.';
    case 'invalid_type':
      return 'Valor em formato inválido.';
    default:
      return 'Valor inválido.';
  }
}
