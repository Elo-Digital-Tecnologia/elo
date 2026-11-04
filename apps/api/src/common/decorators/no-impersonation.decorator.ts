import { SetMetadata } from '@nestjs/common';
import { NO_IMPERSONATION } from '#/common/decorators/metadata-keys.js';

/** Route the Elo team cannot use inside a restaurant panel (credentials). */
export const NoImpersonation = () => SetMetadata(NO_IMPERSONATION, true);
