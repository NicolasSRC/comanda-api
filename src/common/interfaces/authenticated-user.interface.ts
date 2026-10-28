import type { Role } from '@prisma/client';

/** Usuario autenticado que viaja en `request.user`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  restaurantId: string | null;
}

export interface JwtPayload {
  /** Id del usuario. */
  sub: string;
  email: string;
  role: Role;
  /** Id del restaurante (null para superadmin). */
  rid: string | null;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface TokenMeta {
  ip?: string | null;
  userAgent?: string | null;
}
