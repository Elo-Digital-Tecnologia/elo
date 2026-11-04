import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC } from '#/common/decorators/metadata-keys.js';

/** Route without a JWT (public menu, sign-in). Still validated and rate limited. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
