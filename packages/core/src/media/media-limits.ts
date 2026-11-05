const BYTES_PER_MB = 1024 * 1024;

/** Largest image a restaurant can upload (menu photos and profile pictures). */
export const IMAGE_UPLOAD_MAX_MB = 5;
export const IMAGE_UPLOAD_MAX_BYTES = IMAGE_UPLOAD_MAX_MB * BYTES_PER_MB;
/** Images a restaurant may keep in its library; old ones can be deleted to make room. */
export const MEDIA_PER_RESTAURANT = 300;
