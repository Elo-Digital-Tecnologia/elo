import { SetMetadata } from '@nestjs/common';
import { ALLOW_SUSPENDED } from '#/common/decorators/metadata-keys.js';

/** Route open to restaurant staff even while access is suspended (e.g. seeing the subscription). */
export const AllowSuspended = () => SetMetadata(ALLOW_SUSPENDED, true);
