import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateZoneDto, QueryZonesDto, UpdateZoneDto } from './dto/zone.dto';

export const zoneSelect = {
  id: true,
  restaurantId: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { tables: true } },
} satisfies Prisma.ZoneSelect;

export type ZoneRecord = Prisma.ZoneGetPayload<{ select: typeof zoneSelect }>;

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateZoneDto): Promise<ZoneRecord> {
    const restaurantId = requireRestaurantId(actor);
    const name = dto.name.trim();
    await this.assertNameAvailable(restaurantId, name);

    return this.prisma.zone.create({
      data: {
        restaurantId,
        name,
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: zoneSelect,
    });
  }

  async list(actor: AuthenticatedUser, query: QueryZonesDto): Promise<PaginatedResult<ZoneRecord>> {
    const restaurantId = requireRestaurantId(actor);

    const where: Prisma.ZoneWhereInput = {
      restaurantId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.zone.findMany({
        where,
        select: zoneSelect,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.zone.count({ where }),
    ]);

    return paginated(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<ZoneRecord> {
    const restaurantId = requireRestaurantId(actor);

    const zone = await this.prisma.zone.findFirst({
      where: { id, restaurantId },
      select: zoneSelect,
    });

    if (!zone) {
      throw new NotFoundException('Zona no encontrada');
    }

    return zone;
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateZoneDto): Promise<ZoneRecord> {
    const restaurantId = requireRestaurantId(actor);
    const zone = await this.findOne(actor, id);
    const name = dto.name !== undefined ? dto.name.trim() : undefined;

    if (name && name !== zone.name) {
      await this.assertNameAvailable(restaurantId, name, zone.id);
    }

    return this.prisma.zone.update({
      where: { id: zone.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: zoneSelect,
    });
  }

  /**
   * Soft delete de la zona. Se impide si todavía tiene mesas para no dejar
   * mesas operativas sin zona activa.
   */
  async deactivate(actor: AuthenticatedUser, id: string): Promise<ZoneRecord> {
    const zone = await this.findOne(actor, id);

    if (zone._count.tables > 0) {
      throw new ConflictException('La zona tiene mesas asociadas y no se puede desactivar');
    }

    return this.prisma.zone.update({
      where: { id: zone.id },
      data: { isActive: false },
      select: zoneSelect,
    });
  }

  private async assertNameAvailable(
    restaurantId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.zone.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Ya existe una zona con ese nombre');
    }
  }
}
