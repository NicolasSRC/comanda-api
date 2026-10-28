import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import type { JwtPayload, TokenMeta } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { LoginDto } from './dto/login.dto';
import { PasswordService } from './password.service';
import { type UserWithRestaurant, TokenService } from './token.service';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  restaurantId: string | null;
  restaurant: { id: string; name: string; slug: string } | null;
}

export interface SessionResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get accessTokenTtl(): number {
    return this.config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS');
  }

  private toPublicUser(user: UserWithRestaurant): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      restaurantId: user.restaurantId,
      restaurant: user.restaurant
        ? { id: user.restaurant.id, name: user.restaurant.name, slug: user.restaurant.slug }
        : null,
    };
  }

  private signAccessToken(user: UserWithRestaurant): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      rid: user.restaurantId,
      type: 'access',
    };

    return this.jwt.signAsync(payload, { expiresIn: this.accessTokenTtl });
  }

  private assertRestaurantActive(user: UserWithRestaurant): void {
    if (user.role === Role.SUPERADMIN) {
      return;
    }

    if (!user.restaurant || !user.restaurant.isActive) {
      throw new ForbiddenException('El restaurante está inactivo');
    }
  }

  async login(dto: LoginDto, meta: TokenMeta): Promise<SessionResponse> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { restaurant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await this.passwords.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.assertRestaurantActive(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const refresh = await this.tokens.issue(user.id, meta);
    const accessToken = await this.signAccessToken(user);

    return {
      accessToken,
      expiresIn: this.accessTokenTtl,
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
      user: this.toPublicUser(user),
    };
  }

  async refresh(rawRefreshToken: string, meta: TokenMeta): Promise<SessionResponse> {
    const rotated = await this.tokens.rotate(rawRefreshToken, meta);
    const user = rotated.user;

    if (!user.isActive) {
      await this.tokens.revokeAllForUser(user.id);
      throw new UnauthorizedException('Usuario inactivo');
    }

    this.assertRestaurantActive(user);

    const accessToken = await this.signAccessToken(user);

    return {
      accessToken,
      expiresIn: this.accessTokenTtl,
      refreshToken: rotated.token,
      refreshExpiresAt: rotated.expiresAt,
      user: this.toPublicUser(user),
    };
  }

  async logout(rawRefreshToken: string): Promise<{ message: string }> {
    await this.tokens.revokeByToken(rawRefreshToken);
    return { message: 'Sesión cerrada correctamente' };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { restaurant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.toPublicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const matches = await this.passwords.verify(user.passwordHash, dto.currentPassword);
    if (!matches) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
    }

    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.tokens.revokeAllForUser(userId);

    return { message: 'Contraseña actualizada. Inicia sesión nuevamente.' };
  }

  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    // Respuesta idéntica exista o no el correo (evita enumeración de usuarios).
    const message =
      'Si el correo está registrado, recibirás instrucciones para restablecer la contraseña.';

    if (!user || !user.isActive) {
      return { message };
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const ttlMinutes = this.config.getOrThrow<number>('PASSWORD_RESET_TTL_MINUTES');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
      },
    });

    const isProduction = this.config.getOrThrow<string>('NODE_ENV') === 'production';

    // En producción el token se enviaría por correo; en desarrollo se devuelve
    // para poder probar el flujo sin un proveedor de correo.
    return isProduction ? { message } : { message, resetToken: rawToken };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.usedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Token inválido o expirado');
    }

    const passwordHash = await this.passwords.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Contraseña restablecida correctamente' };
  }
}
