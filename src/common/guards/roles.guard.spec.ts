import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { RolesGuard } from './roles.guard';

function contextFor(user?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function reflectorReturning(roles: Role[] | undefined): Reflector {
  return { getAllAndOverride: () => roles } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('permite el acceso cuando el endpoint no exige roles', () => {
    const guard = new RolesGuard(reflectorReturning(undefined));

    expect(guard.canActivate(contextFor())).toBe(true);
  });

  it('permite el acceso cuando el rol del usuario está autorizado', () => {
    const guard = new RolesGuard(reflectorReturning([Role.ADMIN]));
    const user: AuthenticatedUser = {
      id: 'u1',
      email: 'admin@demo.com',
      fullName: 'Admin',
      role: Role.ADMIN,
      restaurantId: 'r1',
    };

    expect(guard.canActivate(contextFor(user))).toBe(true);
  });

  it('rechaza el acceso cuando el rol no está autorizado', () => {
    const guard = new RolesGuard(reflectorReturning([Role.ADMIN]));
    const user: AuthenticatedUser = {
      id: 'u2',
      email: 'mesero@demo.com',
      fullName: 'Mesero',
      role: Role.WAITER,
      restaurantId: 'r1',
    };

    expect(() => guard.canActivate(contextFor(user))).toThrow(
      'No tienes permiso para realizar esta acción',
    );
  });

  it('rechaza el acceso cuando no hay usuario autenticado', () => {
    const guard = new RolesGuard(reflectorReturning([Role.WAITER]));

    expect(() => guard.canActivate(contextFor())).toThrow('No tienes permiso');
  });
});
