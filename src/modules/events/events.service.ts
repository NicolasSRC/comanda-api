import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { Subject } from 'rxjs';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import type { OrderEvent } from './events.types';

@Injectable()
export class EventsService {
  private readonly orderEvents = new Subject<OrderEvent>();

  /** Flujo compartido; el controlador filtra por restaurante. */
  readonly orders$ = this.orderEvents.asObservable();

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  publish(event: Omit<OrderEvent, 'at'> & { at?: string }): void {
    this.orderEvents.next({ ...event, at: event.at ?? new Date().toISOString() });
  }

  /**
   * `EventSource` no permite enviar el encabezado Authorization, así que el
   * access token viaja en la query. Se valida igual que `JwtStrategy`.
   */
  async authenticate(token: string | undefined): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException('Token requerido para el flujo de eventos');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { restaurant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sesión inválida');
    }
    if (user.role !== Role.SUPERADMIN && (!user.restaurant || !user.restaurant.isActive)) {
      throw new UnauthorizedException('El restaurante está inactivo');
    }
    if (!user.restaurantId) {
      throw new UnauthorizedException('El usuario no pertenece a un restaurante');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      restaurantId: user.restaurantId,
    };
  }
}
