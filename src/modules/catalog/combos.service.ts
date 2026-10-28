import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { ComboItemDto, CreateComboDto, QueryCombosDto, UpdateComboDto } from './dto/combo.dto';

const comboInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true } },
      variant: { select: { id: true, name: true } },
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ComboInclude;

export type ComboRecord = Prisma.ComboGetPayload<{ include: typeof comboInclude }>;

interface PreparedItem {
  restaurantId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
}

@Injectable()
export class CombosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateComboDto): Promise<ComboRecord> {
    const restaurantId = requireRestaurantId(actor);
    const name = dto.name.trim();
    await this.assertNameAvailable(restaurantId, name);
    const items = await this.prepareItems(restaurantId, dto.items);

    const combo = await this.prisma.$transaction(async (tx) => {
      const created = await tx.combo.create({
        data: {
          restaurantId,
          name,
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          price: dto.price,
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl.trim() } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: { id: true },
      });

      await tx.comboItem.createMany({
        data: items.map((item) => ({ ...item, comboId: created.id })),
      });
      return created.id;
    });

    return this.getById(restaurantId, combo);
  }

  async list(
    actor: AuthenticatedUser,
    query: QueryCombosDto,
  ): Promise<PaginatedResult<ComboRecord>> {
    const restaurantId = requireRestaurantId(actor);

    const where: Prisma.ComboWhereInput = {
      restaurantId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.combo.findMany({
        where,
        include: comboInclude,
        orderBy: { name: 'asc' },
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.combo.count({ where }),
    ]);

    return paginated(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<ComboRecord> {
    const restaurantId = requireRestaurantId(actor);
    return this.getById(restaurantId, id);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateComboDto): Promise<ComboRecord> {
    const restaurantId = requireRestaurantId(actor);
    const combo = await this.getById(restaurantId, id);
    const name = dto.name !== undefined ? dto.name.trim() : undefined;

    if (name && name !== combo.name) {
      await this.assertNameAvailable(restaurantId, name, combo.id);
    }

    const items = dto.items ? await this.prepareItems(restaurantId, dto.items) : null;
    const priceChanged = dto.price !== undefined && dto.price !== combo.price;

    await this.prisma.$transaction(async (tx) => {
      await tx.combo.update({
        where: { id: combo.id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl.trim() } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      if (items) {
        await tx.comboItem.deleteMany({ where: { comboId: combo.id } });
        await tx.comboItem.createMany({
          data: items.map((item) => ({ ...item, comboId: combo.id })),
        });
      }

      if (priceChanged) {
        await this.audit.record(tx, {
          restaurantId,
          userId: actor.id,
          action: 'UPDATE_COMBO_PRICE',
          entityType: 'Combo',
          entityId: combo.id,
          before: { precio: combo.price },
          after: { precio: dto.price },
          metadata: { combo: name ?? combo.name },
        });
      }
    });

    return this.getById(restaurantId, combo.id);
  }

  /** Soft delete del combo. */
  async deactivate(actor: AuthenticatedUser, id: string): Promise<ComboRecord> {
    const restaurantId = requireRestaurantId(actor);
    const combo = await this.getById(restaurantId, id);

    return this.prisma.combo.update({
      where: { id: combo.id },
      data: { isActive: false },
      include: comboInclude,
    });
  }

  private async getById(restaurantId: string, id: string): Promise<ComboRecord> {
    const combo = await this.prisma.combo.findFirst({
      where: { id, restaurantId },
      include: comboInclude,
    });

    if (!combo) {
      throw new NotFoundException('Combo no encontrado');
    }

    return combo;
  }

  private async prepareItems(restaurantId: string, items: ComboItemDto[]): Promise<PreparedItem[]> {
    if (items.length === 0) {
      throw new BadRequestException('El combo debe incluir al menos un producto');
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, restaurantId },
      select: { id: true },
    });
    const productSet = new Set(products.map((product) => product.id));

    const variantIds = [
      ...new Set(
        items
          .map((item) => item.variantId)
          .filter((variantId): variantId is string => Boolean(variantId)),
      ),
    ];
    const variants =
      variantIds.length > 0
        ? await this.prisma.variant.findMany({
            where: { id: { in: variantIds }, restaurantId },
            select: { id: true, productId: true },
          })
        : [];
    const variantIndex = new Map(variants.map((variant) => [variant.id, variant.productId]));

    const seen = new Set<string>();
    return items.map((item) => {
      if (!productSet.has(item.productId)) {
        throw new NotFoundException('Producto del combo no encontrado');
      }

      if (item.variantId) {
        const owner = variantIndex.get(item.variantId);
        if (!owner) {
          throw new NotFoundException('Variante del combo no encontrada');
        }
        if (owner !== item.productId) {
          throw new BadRequestException('La variante no pertenece al producto del combo');
        }
      }

      const key = `${item.productId}:${item.variantId ?? ''}`;
      if (seen.has(key)) {
        throw new BadRequestException('El combo tiene productos duplicados');
      }
      seen.add(key);

      return {
        restaurantId,
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity ?? 1,
      };
    });
  }

  private async assertNameAvailable(
    restaurantId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.combo.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Ya existe un combo con ese nombre');
    }
  }
}
