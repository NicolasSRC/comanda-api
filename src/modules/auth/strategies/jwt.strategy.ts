import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
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

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      restaurantId: user.restaurantId,
    };
  }
}
