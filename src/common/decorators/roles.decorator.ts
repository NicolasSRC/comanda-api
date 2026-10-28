import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restringe un endpoint a uno o varios roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
