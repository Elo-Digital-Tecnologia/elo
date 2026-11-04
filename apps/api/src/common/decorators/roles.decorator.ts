import type { Role } from '@elo/core/roles/roles';
import { SetMetadata } from '@nestjs/common';
import { ROLES } from '#/common/decorators/metadata-keys.js';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
