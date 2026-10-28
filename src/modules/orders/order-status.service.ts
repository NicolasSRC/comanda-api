import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { OrderItemStatus, Role } from '@prisma/client';

/**
 * Transiciones permitidas para un ítem de pedido (RF-45):
 *
 *   PENDING ──► IN_PREPARATION ──► READY ──► SERVED
 *      │              │              │
 *      └──────────────┴──────────────┴──► CANCELLED
 *
 * La cancelación se hace por su propio endpoint para exigir motivo.
 */
const TRANSITIONS: Record<OrderItemStatus, readonly OrderItemStatus[]> = {
  [OrderItemStatus.PENDING]: [OrderItemStatus.IN_PREPARATION, OrderItemStatus.CANCELLED],
  [OrderItemStatus.IN_PREPARATION]: [OrderItemStatus.READY, OrderItemStatus.CANCELLED],
  [OrderItemStatus.READY]: [OrderItemStatus.SERVED, OrderItemStatus.CANCELLED],
  [OrderItemStatus.SERVED]: [OrderItemStatus.CANCELLED],
  [OrderItemStatus.CANCELLED]: [],
};

/** Roles autorizados para cada transición (ADMIN siempre puede). */
const TRANSITION_ROLES: Partial<Record<string, readonly Role[]>> = {
  [`${OrderItemStatus.PENDING}->${OrderItemStatus.IN_PREPARATION}`]: [
    Role.WAITER,
    Role.KITCHEN,
    Role.ADMIN,
  ],
  [`${OrderItemStatus.IN_PREPARATION}->${OrderItemStatus.READY}`]: [Role.KITCHEN, Role.ADMIN],
  [`${OrderItemStatus.READY}->${OrderItemStatus.SERVED}`]: [Role.WAITER, Role.ADMIN],
};

@Injectable()
export class OrderStatusService {
  canTransition(from: OrderItemStatus, to: OrderItemStatus): boolean {
    return TRANSITIONS[from].includes(to);
  }

  assertTransition(from: OrderItemStatus, to: OrderItemStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(`Transición de estado no permitida: ${from} → ${to}`);
    }
  }

  assertRoleForTransition(from: OrderItemStatus, to: OrderItemStatus, role: Role): void {
    if (role === Role.ADMIN) {
      return;
    }

    const allowed = TRANSITION_ROLES[`${from}->${to}`];
    if (!allowed || !allowed.includes(role)) {
      throw new ForbiddenException(`Tu rol no puede cambiar un ítem de ${from} a ${to}`);
    }
  }

  /** RF-44: cancelar exige motivo; un ítem servido solo lo anula un ADMIN. */
  assertCanCancel(status: OrderItemStatus, role: Role): void {
    if (status === OrderItemStatus.CANCELLED) {
      throw new BadRequestException('El ítem ya está cancelado');
    }

    if (role !== Role.ADMIN && role !== Role.WAITER) {
      throw new ForbiddenException('No tienes permiso para cancelar ítems');
    }

    if (status === OrderItemStatus.SERVED && role !== Role.ADMIN) {
      throw new ForbiddenException('Solo un administrador puede cancelar un ítem servido');
    }
  }
}
