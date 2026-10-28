import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/** Inyecta el usuario autenticado (o una de sus propiedades). */
export const CurrentUser = createParamDecorator(
  (property: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return property ? request.user?.[property] : request.user;
  },
);
