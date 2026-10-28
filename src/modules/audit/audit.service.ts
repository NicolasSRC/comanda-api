import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { resolveDateRange } from '../../common/utils/date-range';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditAction, AuditEntityType, AuditQueryDto } from './dto/audit.dto';

export interface AuditInput {
  restaurantId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditLogResponse {
  id: string;
  accion: AuditAction;
  entidad: AuditEntityType;
  entidadId: string;
  usuario: { id: string; nombre: string } | null;
  antes: Prisma.JsonValue | null;
  despues: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  creadoEn: Date;
}

type AuditDb = Pick<Prisma.TransactionClient, 'auditLog'>;

const auditInclude = {
  user: { select: { id: true, fullName: true } },
} satisfies Prisma.AuditLogInclude;

type AuditRecord = Prisma.AuditLogGetPayload<{ include: typeof auditInclude }>;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registra una acción sensible dentro de la misma transacción del cambio. */
  async record(db: AuditDb, input: AuditInput): Promise<void> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      restaurantId: input.restaurantId,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ...(input.before !== undefined ? { before: input.before } : {}),
      ...(input.after !== undefined ? { after: input.after } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      ...(input.ip !== undefined ? { ip: input.ip } : {}),
      ...(input.userAgent !== undefined ? { userAgent: input.userAgent } : {}),
    };

    await db.auditLog.create({ data });
  }

  /** RF-71: consulta del registro de auditoría con filtros y paginación. */
  async list(
    actor: AuthenticatedUser,
    query: AuditQueryDto,
  ): Promise<PaginatedResult<AuditLogResponse>> {
    const restaurantId = requireRestaurantId(actor);
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { timezone: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado');
    }

    const { from, to } = resolveDateRange({
      desde: query.desde,
      hasta: query.hasta,
      timeZone: restaurant.timezone,
    });

    const where: Prisma.AuditLogWhereInput = {
      restaurantId,
      createdAt: { gte: from, lte: to },
      ...(query.accion ? { action: query.accion } : {}),
      ...(query.entidad ? { entityType: query.entidad } : {}),
      ...(query.entidadId ? { entityId: query.entidadId } : {}),
      ...(query.usuarioId ? { userId: query.usuarioId } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: auditInclude,
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginated(data.map(toAuditResponse), total, query.page, query.limit);
  }
}

function toAuditResponse(log: AuditRecord): AuditLogResponse {
  return {
    id: log.id,
    accion: log.action as AuditAction,
    entidad: log.entityType as AuditEntityType,
    entidadId: log.entityId,
    usuario: log.user ? { id: log.user.id, nombre: log.user.fullName } : null,
    antes: log.before,
    despues: log.after,
    metadata: log.metadata,
    creadoEn: log.createdAt,
  };
}
