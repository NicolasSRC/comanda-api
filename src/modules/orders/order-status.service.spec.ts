import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderItemStatus, Role } from '@prisma/client';
import { OrderStatusService } from './order-status.service';

const service = new OrderStatusService();

describe('OrderStatusService — transiciones', () => {
  it('permite el flujo PENDING → IN_PREPARATION → READY → SERVED', () => {
    expect(service.canTransition(OrderItemStatus.PENDING, OrderItemStatus.IN_PREPARATION)).toBe(
      true,
    );
    expect(service.canTransition(OrderItemStatus.IN_PREPARATION, OrderItemStatus.READY)).toBe(true);
    expect(service.canTransition(OrderItemStatus.READY, OrderItemStatus.SERVED)).toBe(true);
  });

  it('permite cancelar desde cualquier estado no cancelado', () => {
    for (const status of [
      OrderItemStatus.PENDING,
      OrderItemStatus.IN_PREPARATION,
      OrderItemStatus.READY,
      OrderItemStatus.SERVED,
    ]) {
      expect(service.canTransition(status, OrderItemStatus.CANCELLED)).toBe(true);
    }
  });

  it('rechaza saltos y transiciones desde CANCELLED', () => {
    expect(service.canTransition(OrderItemStatus.PENDING, OrderItemStatus.READY)).toBe(false);
    expect(service.canTransition(OrderItemStatus.PENDING, OrderItemStatus.SERVED)).toBe(false);
    expect(service.canTransition(OrderItemStatus.SERVED, OrderItemStatus.READY)).toBe(false);
    expect(service.canTransition(OrderItemStatus.CANCELLED, OrderItemStatus.PENDING)).toBe(false);
  });

  it('lanza 400 al intentar una transición inválida', () => {
    expect(() => service.assertTransition(OrderItemStatus.PENDING, OrderItemStatus.SERVED)).toThrow(
      BadRequestException,
    );
  });
});

describe('OrderStatusService — roles', () => {
  it('permite al mesero enviar a preparación y al cocinero marcar listo', () => {
    expect(() =>
      service.assertRoleForTransition(
        OrderItemStatus.PENDING,
        OrderItemStatus.IN_PREPARATION,
        Role.WAITER,
      ),
    ).not.toThrow();
    expect(() =>
      service.assertRoleForTransition(
        OrderItemStatus.IN_PREPARATION,
        OrderItemStatus.READY,
        Role.KITCHEN,
      ),
    ).not.toThrow();
  });

  it('impide que el mesero marque listo y que cocina marque servido', () => {
    expect(() =>
      service.assertRoleForTransition(
        OrderItemStatus.IN_PREPARATION,
        OrderItemStatus.READY,
        Role.WAITER,
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      service.assertRoleForTransition(OrderItemStatus.READY, OrderItemStatus.SERVED, Role.KITCHEN),
    ).toThrow(ForbiddenException);
  });

  it('permite al administrador cualquier transición válida', () => {
    expect(() =>
      service.assertRoleForTransition(
        OrderItemStatus.IN_PREPARATION,
        OrderItemStatus.READY,
        Role.ADMIN,
      ),
    ).not.toThrow();
  });
});

describe('OrderStatusService — cancelación', () => {
  it('exige motivo y permite al mesero cancelar ítems no servidos', () => {
    expect(() => service.assertCanCancel(OrderItemStatus.PENDING, Role.WAITER)).not.toThrow();
    expect(() => service.assertCanCancel(OrderItemStatus.READY, Role.WAITER)).not.toThrow();
  });

  it('solo permite al administrador cancelar un ítem servido', () => {
    expect(() => service.assertCanCancel(OrderItemStatus.SERVED, Role.WAITER)).toThrow(
      ForbiddenException,
    );
    expect(() => service.assertCanCancel(OrderItemStatus.SERVED, Role.ADMIN)).not.toThrow();
  });

  it('rechaza cancelar dos veces y roles sin permiso', () => {
    expect(() => service.assertCanCancel(OrderItemStatus.CANCELLED, Role.ADMIN)).toThrow(
      BadRequestException,
    );
    expect(() => service.assertCanCancel(OrderItemStatus.PENDING, Role.KITCHEN)).toThrow(
      ForbiddenException,
    );
  });
});
