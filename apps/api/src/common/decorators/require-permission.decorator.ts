import type { Permission } from '@elo/core/roles/permissions';
import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS } from '#/common/decorators/metadata-keys.js';

/** The superadmin always passes; the Elo team needs the permission. */
export const RequirePermission = (...p: Permission[]) => SetMetadata(PERMISSIONS, p);
