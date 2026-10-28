import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCategoryDto, QueryCategoriesDto, UpdateCategoryDto } from './dto/category.dto';

export const categorySelect = {
  id: true,
  restaurantId: true,
  name: true,
  description: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { products: true } },
} satisfies Prisma.CategorySelect;

export type CategoryRecord = Prisma.CategoryGetPayload<{ select: typeof categorySelect }>;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthenticatedUser, dto: CreateCategoryDto): Promise<CategoryRecord> {
    const restaurantId = requireRestaurantId(actor);
    const name = dto.name.trim();
    await this.assertNameAvailable(restaurantId, name);

    return this.prisma.category.create({
      data: {
        restaurantId,
        name,
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: categorySelect,
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: QueryCategoriesDto,
  ): Promise<PaginatedResult<CategoryRecord>> {
    const restaurantId = requireRestaurantId(actor);

    const where: Prisma.CategoryWhereInput = {
      restaurantId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        select: categorySelect,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.category.count({ where }),
    ]);

    return paginated(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<CategoryRecord> {
    const restaurantId = requireRestaurantId(actor);

    const category = await this.prisma.category.findFirst({
      where: { id, restaurantId },
      select: categorySelect,
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return category;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryRecord> {
    const restaurantId = requireRestaurantId(actor);
    const category = await this.findOne(actor, id);
    const name = dto.name !== undefined ? dto.name.trim() : undefined;

    if (name && name !== category.name) {
      await this.assertNameAvailable(restaurantId, name, category.id);
    }

    return this.prisma.category.update({
      where: { id: category.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: categorySelect,
    });
  }

  /** Soft delete (regla 10): la categoría y su historial se conservan. */
  async deactivate(actor: AuthenticatedUser, id: string): Promise<CategoryRecord> {
    const category = await this.findOne(actor, id);

    return this.prisma.category.update({
      where: { id: category.id },
      data: { isActive: false },
      select: categorySelect,
    });
  }

  private async assertNameAvailable(
    restaurantId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.category.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }
  }
}
