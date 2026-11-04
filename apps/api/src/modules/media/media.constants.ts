import { IMAGE_UPLOAD_MAX_BYTES } from '@elo/core/media/media-limits';

export const MAX_UPLOAD_BYTES = IMAGE_UPLOAD_MAX_BYTES;
/** Images a restaurant may keep in its bank; old ones can be deleted to make room. */
export const MEDIA_PER_RESTAURANT = 300;

/** Largest image sharp will decode, against decompression bombs. */
export const IMAGE_MAX_INPUT_PIXELS = 40_000_000;
export const MENU_IMAGE = { size: 1200, quality: 80 } as const;
export const MENU_THUMBNAIL = { size: 400, quality: 75 } as const;
export const AVATAR_IMAGE = { size: 256, quality: 80 } as const;
/** Library files never change (new image, new id), so browsers keep them for a year. */
export const MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const MEDIA_FILE_PATTERN = /^[0-9a-f-]{36}(-sm)?\.webp$/;
