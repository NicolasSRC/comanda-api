import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Devuelve el restaurante del token o lanza 403.
 *
 * El `restaurantId` nunca se toma del cuerpo, la URL ni un encabezado
 * (REQUERIMIENTOS.md RF-05).
 */
export function requireRestaurantId(actor: AuthenticatedUser): string {
  if (!actor.restaurantId) {
    throw new ForbiddenException('Esta operación requiere un restaurante');
  }

  return actor.restaurantId;
}
