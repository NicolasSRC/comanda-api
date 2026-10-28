import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AssociateModifierGroupDto } from '../modifiers/dto/modifier.dto';
import type {
  CreateProductDto,
  QueryProductsDto,
  UpdateAvailabilityDto,
  UpdateProductDto,
} from './dto/product.dto';
import type { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto';

export const productListSelect = {
  id: true,
  restaurantId: true,
  categoryId: true,
  name: true,
  description: true,
  basePrice: true,
  imageUrl: true,
  preparationArea: true,
  isAvailable: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  _count: { select: { variants: true } },
} satisfies Prisma.ProductSelect;

export const productDetailInclude = {
  category: { select: { id: true, name: true } },
  variants: { orderBy: { sortOrder: 'asc' } },
  priceRules: { orderBy: [{ priority: 'desc' }, { name: 'asc' }] },
  availabilityWindows: { orderBy: { createdAt: 'asc' } },
  modifierGroups: {
    orderBy: { sortOrder: 'asc' },
    include: {
      group: {
        include: {
          modifiers: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductListItem = Prisma.ProductGetPayload<{ select: typeof productListSelect }>;
export type ProductDetail = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>;

const variantSelect = {
  id: true,
  restaurantId: true,
  productId: true,
  name: true,
  price: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VariantSelect;

export type VariantRecord = Prisma.VariantGetPayload<{ select: typeof variantSelect }>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateProductDto): Promise<ProductDetail> {
    const restaurantId = requireRestaurantId(actor);
    await this.assertCategory(restaurantId, dto.categoryId);

    const name = dto.name.trim();
    await this.assertNameAvailable(restaurantId, name);

    const product = await this.prisma.product.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name,
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        basePrice: dto.basePrice,
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl.trim() } : {}),
        preparationArea: dto.preparationArea,
        ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: productDetailInclude,
    });

    return product;
  }

  async list(
    actor: AuthenticatedUser,
    query: QueryProductsDto,
  ): Promise<PaginatedResult<ProductListItem>> {
    const restaurantId = requireRestaurantId(actor);

    const where: Prisma.ProductWhereInput = {
      restaurantId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.preparationArea ? { preparationArea: query.preparationArea } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.isAvailable !== undefined ? { isAvailable: query.isAvailable } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: productListSelect,
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginated(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<ProductDetail> {
    const restaurantId = requireRestaurantId(actor);

    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
      include: productDetailInclude,
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductDetail> {
    const restaurantId = requireRestaurantId(actor);
    const product = await this.getProduct(actor, id);

    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      await this.assertCategory(restaurantId, dto.categoryId);
    }

    const name = dto.name !== undefined ? dto.name.trim() : undefined;
    if (name && name !== product.name) {
      await this.assertNameAvailable(restaurantId, name, product.id);
    }

    const priceChanged = dto.basePrice !== undefined && dto.basePrice !== product.basePrice;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: product.id },
        data: {
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(name !== undefined ? { name } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl.trim() } : {}),
          ...(dto.preparationArea !== undefined ? { preparationArea: dto.preparationArea } : {}),
          ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: productDetailInclude,
      });

      if (priceChanged) {
        await this.audit.record(tx, {
          restaurantId,
          userId: actor.id,
          action: 'UPDATE_PRODUCT_PRICE',
          entityType: 'Product',
          entityId: product.id,
          before: { precioBase: product.basePrice },
          after: { precioBase: updated.basePrice },
          metadata: { producto: updated.name },
        });
      }

      return updated;
    });
  }

  /** RF-15: disponibilidad inmediata (agotado / disponible). */
  async setAvailability(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateAvailabilityDto,
  ): Promise<ProductDetail> {
    const product = await this.getProduct(actor, id);

    return this.prisma.product.update({
      where: { id: product.id },
      data: { isAvailable: dto.isAvailable },
      include: productDetailInclude,
    });
  }

  /** Soft delete del producto (regla 10). */
  async deactivate(actor: AuthenticatedUser, id: string): Promise<ProductDetail> {
    const product = await this.getProduct(actor, id);

    return this.prisma.product.update({
      where: { id: product.id },
      data: { isActive: false, isAvailable: false },
      include: productDetailInclude,
    });
  }

  async listVariants(actor: AuthenticatedUser, productId: string): Promise<VariantRecord[]> {
    const product = await this.getProduct(actor, productId);

    return this.prisma.variant.findMany({
      where: { productId: product.id, restaurantId: product.restaurantId },
      select: variantSelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createVariant(
    actor: AuthenticatedUser,
    productId: string,
    dto: CreateVariantDto,
  ): Promise<VariantRecord> {
    const product = await this.getProduct(actor, productId);
    const name = dto.name.trim();

    const duplicate = await this.prisma.variant.findFirst({
      where: {
        productId: product.id,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('Ya existe una variante con ese nombre');
    }

    return this.prisma.variant.create({
      data: {
        restaurantId: product.restaurantId,
        productId: product.id,
        name,
        price: dto.price,
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: variantSelect,
    });
  }

  async updateVariant(
    actor: AuthenticatedUser,
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ): Promise<VariantRecord> {
    const product = await this.getProduct(actor, productId);
    const variant = await this.getVariant(product.id, product.restaurantId, variantId);
    const name = dto.name !== undefined ? dto.name.trim() : undefined;

    if (name && name !== variant.name) {
      const duplicate = await this.prisma.variant.findFirst({
        where: {
          productId: product.id,
          name: { equals: name, mode: 'insensitive' },
          id: { not: variant.id },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException('Ya existe una variante con ese nombre');
      }
    }

    const priceChanged = dto.price !== undefined && dto.price !== variant.price;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.variant.update({
        where: { id: variant.id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: variantSelect,
      });

      if (priceChanged) {
        await this.audit.record(tx, {
          restaurantId: product.restaurantId,
          userId: actor.id,
          action: 'UPDATE_VARIANT_PRICE',
          entityType: 'Variant',
          entityId: variant.id,
          before: { precio: variant.price },
          after: { precio: updated.price },
          metadata: { productoId: product.id, variante: updated.name },
        });
      }

      return updated;
    });
  }

  /** Soft delete de la variante. */
  async deactivateVariant(
    actor: AuthenticatedUser,
    productId: string,
    variantId: string,
  ): Promise<VariantRecord> {
    const product = await this.getProduct(actor, productId);
    const variant = await this.getVariant(product.id, product.restaurantId, variantId);

    return this.prisma.variant.update({
      where: { id: variant.id },
      data: { isActive: false },
      select: variantSelect,
    });
  }

  async associateModifierGroup(
    actor: AuthenticatedUser,
    productId: string,
    dto: AssociateModifierGroupDto,
  ) {
    const product = await this.getProduct(actor, productId);
    const group = await this.prisma.modifierGroup.findFirst({
      where: { id: dto.groupId, restaurantId: product.restaurantId },
      select: { id: true, name: true },
    });
    if (!group) {
      throw new NotFoundException('Grupo de modificadores no encontrado');
    }

    return this.prisma.productModifierGroup.upsert({
      where: { productId_groupId: { productId: product.id, groupId: group.id } },
      update: { sortOrder: dto.sortOrder ?? 0 },
      create: {
        productId: product.id,
        groupId: group.id,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        group: { include: { modifiers: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
  }

  async removeModifierGroup(
    actor: AuthenticatedUser,
    productId: string,
    groupId: string,
  ): Promise<{ removed: true }> {
    const product = await this.getProduct(actor, productId);

    const result = await this.prisma.productModifierGroup.deleteMany({
      where: { productId: product.id, groupId },
    });

    if (result.count === 0) {
      throw new NotFoundException('El grupo no está asociado al producto');
    }

    return { removed: true };
  }

  private async getProduct(actor: AuthenticatedUser, id: string) {
    const restaurantId = requireRestaurantId(actor);

    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
      select: {
        id: true,
        restaurantId: true,
        categoryId: true,
        name: true,
        basePrice: true,
        isActive: true,
        isAvailable: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  private async getVariant(productId: string, restaurantId: string, variantId: string) {
    const variant = await this.prisma.variant.findFirst({
      where: { id: variantId, productId, restaurantId },
      select: { id: true, name: true, price: true },
    });

    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    return variant;
  }

  private async assertCategory(restaurantId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, restaurantId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
  }

  private async assertNameAvailable(
    restaurantId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.product.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Ya existe un producto con ese nombre');
    }
  }
}
