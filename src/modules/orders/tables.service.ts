import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateTableDto, QueryTablesDto, UpdateTableDto } from './dto/table.dto';

export const tableSelect = {
  id: true,
  restaurantId: true,
  zoneId: true,
  name: true,
  capacity: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  zone: { select: { id: true, name: true, isActive: true } },
  orders: {
    where: { status: OrderStatus.OPEN },
    take: 1,
    orderBy: { openedAt: 'desc' },
    select: {
      id: true,
      status: true,
      guests: true,
      openedAt: true,
      waiterId: true,
    },
  },
} satisfies Prisma.RestaurantTableSelect;

export type TableRecord = Prisma.RestaurantTableGetPayload<{ select: typeof tableSelect }>;

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateTableDto): Promise<TableRecord> {
    const restaurantId = requireRestaurantId(actor);
    await this.assertZone(restaurantId, dto.zoneId);

    const name = dto.name.trim();
    await this.assertNameAvailable(restaurantId, name);

    return this.prisma.restaurantTable.create({
      data: {
        restaurantId,
        zoneId: dto.zoneId,
        name,
        capacity: dto.capacity,
      },
      select: tableSelect,
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: QueryTablesDto,
  ): Promise<PaginatedResult<TableRecord>> {
    const restaurantId = requireRestaurantId(actor);

    const where: Prisma.RestaurantTableWhereInput = {
      restaurantId,
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.restaurantTable.findMany({
        where,
        select: tableSelect,
        orderBy: [{ zone: { sortOrder: 'asc' } }, { name: 'asc' }],
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.restaurantTable.count({ where }),
    ]);

    return paginated(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<TableRecord> {
    const restaurantId = requireRestaurantId(actor);

    const table = await this.prisma.restaurantTable.findFirst({
      where: { id, restaurantId },
      select: tableSelect,
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }

    return table;
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateTableDto): Promise<TableRecord> {
    const restaurantId = requireRestaurantId(actor);
    const table = await this.findOne(actor, id);

    if (dto.zoneId && dto.zoneId !== table.zoneId) {
      await this.assertZone(restaurantId, dto.zoneId);
    }

    const name = dto.name !== undefined ? dto.name.trim() : undefined;
    if (name && name !== table.name) {
      await this.assertNameAvailable(restaurantId, name, table.id);
    }

    return this.prisma.restaurantTable.update({
      where: { id: table.id },
      data: {
        ...(dto.zoneId !== undefined ? { zoneId: dto.zoneId } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      },
      select: tableSelect,
    });
  }

  private async assertZone(restaurantId: string, zoneId: string): Promise<void> {
    const zone = await this.prisma.zone.findFirst({
      where: { id: zoneId, restaurantId },
      select: { id: true, isActive: true },
    });

    if (!zone) {
      throw new NotFoundException('Zona no encontrada');
    }
    if (!zone.isActive) {
      throw new ConflictException('La zona está inactiva');
    }
  }

  private async assertNameAvailable(
    restaurantId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.restaurantTable.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Ya existe una mesa con ese nombre');
    }
  }
}
