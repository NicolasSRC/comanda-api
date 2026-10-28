import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMenuSnapshot } from './menu-snapshot.builder';
import type { MenuSnapshot } from './menu-snapshot.types';

/**
 * Construye la foto JSON de la carta que se guarda en cada versión.
 *
 * El snapshot incluye la configuración (precios base, variantes, reglas,
 * ventanas y modificadores) sin los campos internos del restaurante. El
 * precio efectivo y la disponibilidad se resuelven al consultar, para que
 * las reglas por horario sigan funcionando sobre una versión publicada.
 */
@Injectable()
export class MenuSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  build(restaurantId: string): Promise<MenuSnapshot> {
    return buildMenuSnapshot(this.prisma, restaurantId);
  }
}
