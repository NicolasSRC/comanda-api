import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateTaxDto, QueryTaxesDto, UpdateTaxDto } from './dto/tax.dto';

const taxSelect = {
  id: true,
  name: true,
  rateBps: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaxSelect;

export type TaxRecord = Prisma.TaxGetPayload<{ select: typeof taxSelect }>;

export interface TaxResponse {
  id: string;
  nombre: string;
  tasaBps: number;
  activo: boolean;
  orden: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

@Injectable()
export class TaxesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateTaxDto): Promise<TaxResponse> {
    const restaurantId = requireRestaurantId(actor);
    const name = dto.nombre.trim();

    if (dto.activo !== false) {
      await this.assertSingleActiveTax(restaurantId);
    }

    const existing = await this.prisma.tax.findFirst({
      where: { restaurantId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe un impuesto con ese nombre');
    }

    const tax = await this.prisma.tax.create({
      data: {
        restaurantId,
        name,
        rateBps: dto.tasaBps,
        ...(dto.orden !== undefined ? { sortOrder: dto.orden } : {}),
        ...(dto.activo !== undefined ? { isActive: dto.activo } : {}),
      },
      select: taxSelect,
    });

    return toTaxResponse(tax);
  }

  async list(
    actor: AuthenticatedUser,
    query: QueryTaxesDto,
  ): Promise<PaginatedResult<TaxResponse>> {
    const restaurantId = requireRestaurantId(actor);
    const where: Prisma.TaxWhereInput = {
      restaurantId,
      ...(query.activo !== undefined ? { isActive: query.activo } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tax.findMany({
        where,
        select: taxSelect,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.tax.count({ where }),
    ]);

    return paginated(data.map(toTaxResponse), total, query.page, query.limit);
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<TaxResponse> {
    const restaurantId = requireRestaurantId(actor);
    const tax = await this.prisma.tax.findFirst({
      where: { id, restaurantId },
      select: taxSelect,
    });

    if (!tax) {
      throw new NotFoundException('Impuesto no encontrado');
    }

    return toTaxResponse(tax);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateTaxDto): Promise<TaxResponse> {
    const current = await this.findOne(actor, id);
    const restaurantId = requireRestaurantId(actor);

    if (dto.activo === true && !current.activo) {
      await this.assertSingleActiveTax(restaurantId, id);
    }

    if (dto.nombre !== undefined) {
      const name = dto.nombre.trim();
      const duplicate = await this.prisma.tax.findFirst({
        where: {
          restaurantId,
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException('Ya existe un impuesto con ese nombre');
      }
    }

    const tax = await this.prisma.tax.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { name: dto.nombre.trim() } : {}),
        ...(dto.tasaBps !== undefined ? { rateBps: dto.tasaBps } : {}),
        ...(dto.orden !== undefined ? { sortOrder: dto.orden } : {}),
        ...(dto.activo !== undefined ? { isActive: dto.activo } : {}),
      },
      select: taxSelect,
    });

    return toTaxResponse(tax);
  }

  async deactivate(actor: AuthenticatedUser, id: string): Promise<TaxResponse> {
    await this.findOne(actor, id);
    const tax = await this.prisma.tax.update({
      where: { id },
      data: { isActive: false },
      select: taxSelect,
    });
    return toTaxResponse(tax);
  }

  private async assertSingleActiveTax(restaurantId: string, excludingId?: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { pricesIncludeTax: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado');
    }
    if (!restaurant.pricesIncludeTax) {
      return;
    }

    const active = await this.prisma.tax.count({
      where: {
        restaurantId,
        isActive: true,
        ...(excludingId ? { id: { not: excludingId } } : {}),
      },
    });

    if (active > 0) {
      throw new ConflictException(
        'Con precios con impuesto incluido solo se permite un impuesto activo',
      );
    }
  }
}

function toTaxResponse(tax: TaxRecord): TaxResponse {
  return {
    id: tax.id,
    nombre: tax.name,
    tasaBps: tax.rateBps,
    activo: tax.isActive,
    orden: tax.sortOrder,
    creadoEn: tax.createdAt,
    actualizadoEn: tax.updatedAt,
  };
}
