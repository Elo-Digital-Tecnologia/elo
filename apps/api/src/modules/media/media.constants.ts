import {
    IMAGE_UPLOAD_MAX_BYTES,
    MEDIA_PER_RESTAURANT as MEDIA_LIMIT
} from '@elo/core/media/media-limits';

export const MAX_UPLOAD_BYTES = IMAGE_UPLOAD_MAX_BYTES;
export const MEDIA_PER_RESTAURANT = MEDIA_LIMIT;

/** Largest image sharp will decode, against decompression bombs. */
export const IMAGE_MAX_INPUT_PIXELS = 40_000_000;
export const MENU_IMAGE = { size: 1200, quality: 80 } as const;
export const MENU_THUMBNAIL = { size: 400, quality: 75 } as const;
export const AVATAR_IMAGE = { size: 256, quality: 80 } as const;
/** Library files never change (new image, new id), so browsers keep them for a year. */
export const MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable';
/** Library id inside any image link (relative, absolute or the thumbnail), to tell what is in use. */
export const MEDIA_ID_IN_URL = /\/api\/media\/([0-9a-f-]{36})(?:-sm)?\.webp/;
export const MEDIA_FILE_PATTERN = /^[0-9a-f-]{36}(-sm)?\.webp$/;
