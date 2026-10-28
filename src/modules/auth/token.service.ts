import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { TokenMeta } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

export type UserWithRestaurant = Prisma.UserGetPayload<{ include: { restaurant: true } }>;

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export interface RotatedRefreshToken extends IssuedRefreshToken {
  user: UserWithRestaurant;
}

/**
 * Refresh tokens opacos con rotación y detección de reutilización (RF-02).
 * En la base de datos solo se guarda el hash SHA-256 del token.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateToken(): string {
    return randomBytes(64).toString('base64url');
  }

  private get expiresAt(): Date {
    const days = this.config.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS');
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  async issue(userId: string, meta: TokenMeta, familyId?: string): Promise<IssuedRefreshToken> {
    const token = this.generateToken();
    const expiresAt = this.expiresAt;

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        familyId: familyId ?? randomUUID(),
        expiresAt,
        createdByIp: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return { token, expiresAt };
  }

  async rotate(rawToken: string, meta: TokenMeta): Promise<RotatedRefreshToken> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: { include: { restaurant: true } } },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (stored.revokedAt) {
      // Reutilización de un token ya rotado: se revoca toda la familia.
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reutilizado; la sesión fue revocada');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const nextToken = this.generateToken();
    const expiresAt = this.expiresAt;

    const created = await this.prisma.$transaction(async (tx) => {
      // Reclamo atómico: evita que dos peticiones roten el mismo token.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (claimed.count === 0) {
        return null;
      }

      const next = await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: this.hashToken(nextToken),
          familyId: stored.familyId,
          expiresAt,
          createdByIp: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });

      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { replacedByTokenId: next.id },
      });

      return next;
    });

    if (!created) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reutilizado; la sesión fue revocada');
    }

    return { token: nextToken, expiresAt, user: stored.user };
  }

  async revokeByToken(rawToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
    });

    if (stored) {
      await this.revokeFamily(stored.familyId);
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
