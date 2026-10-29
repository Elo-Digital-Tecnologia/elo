/**
 * Field rules shared by the API and the forms, so both accept and reject the
 * same values. Each check returns the normalized value, or null when invalid.
 */

/** Letters (accents included), spaces, apostrophes, dots and hyphens; starts with a letter. */
export const PERSON_NAME = /^[\p{L}][\p{L} .'-]*$/u;

export const LIMITS = {
  personName: { min: 2, max: 80 },
  restaurantName: { min: 2, max: 120 },
  description: 300,
  address: 160,
  wifiName: 32,
  wifiPassword: 63,
  /** Service fee in basis points (2000 = 20%). */
  serviceFeeBpsMax: 2000,
} as const;

export function personName(value: string): string | null {
  const v = value.trim().replace(/\s+/g, ' ');
  return v.length >= LIMITS.personName.min && v.length <= LIMITS.personName.max && PERSON_NAME.test(v) ? v : null;
}

/**
 * Brazilian landline (10 digits) or mobile (11, starting with 9 after the area
 * code), with or without +55 and punctuation. Returns "(11) 91234-5678".
 */
export function brazilPhone(value: string): string | null {
  let d = value.replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (d[0] === '0' || d[1] === '0') return null;
  if (d.length === 11 && d[2] !== '9') return null;
  const local = d.slice(2);
  return `(${d.slice(0, 2)}) ${local.slice(0, local.length - 4)}-${local.slice(-4)}`;
}

/** Instagram handle without the @, lowercase: letters, digits, dot and underscore, no leading/trailing or double dot. */
export function instagramHandle(value: string): string | null {
  const v = value.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '').toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(v) || v.startsWith('.') || v.endsWith('.') || v.includes('..')) return null;
  return v;
}

export function email(value: string): string | null {
  const v = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120 ? v : null;
}

/** Manager contact: a phone (formatted) or an e-mail. */
export function contact(value: string): string | null {
  return value.includes('@') ? email(value) : brazilPhone(value);
}

/** Phone typed so far, formatted as it grows: "(11) 9123", "(11) 91234-5678". */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  const local = d.slice(2);
  const split = d.length === 11 ? 5 : 4;
  return local.length > split ? `(${d.slice(0, 2)}) ${local.slice(0, split)}-${local.slice(split)}` : `(${d.slice(0, 2)}) ${local}`;
}
