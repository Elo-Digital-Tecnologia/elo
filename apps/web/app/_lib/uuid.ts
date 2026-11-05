const UUID_BYTES = 16;
/** Byte 6 carries the version (4) and byte 8 the RFC 4122 variant. */
const VERSION_BYTE = 6;
const VARIANT_BYTE = 8;

/**
 * A random v4 uuid. `crypto.randomUUID` exists only on https and localhost, so a
 * phone opening the panel over the local network would miss it; `getRandomValues`
 * works everywhere.
 */
export function newUuid(): string {
    const b = crypto.getRandomValues(new Uint8Array(UUID_BYTES));
    b[VERSION_BYTE] = (b[VERSION_BYTE] & 0x0f) | 0x40;
    b[VARIANT_BYTE] = (b[VARIANT_BYTE] & 0x3f) | 0x80;
    const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
