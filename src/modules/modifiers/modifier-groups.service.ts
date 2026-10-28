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
import type {
  CreateModifierDto,
  CreateModifierGroupDto,
  QueryModifierGroupsDto,
  UpdateModifierDto,
  UpdateModifierGroupDto,
} from './dto/modifier.dto';

const groupInclude = {
  modifiers: { orderBy: { sortOrder: 'asc' } },
  _count: { select: { products: true } },
} satisfies Prisma.ModifierGroupInclude;

export type ModifierGroupRecord = Prisma.ModifierGroupGetPayload<{
  include: typeof groupInclude;
}>;

const modifierSelect = {
  id: true,
  restaurantId: true,
  groupId: true,
  name: true,
  extraPrice: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ModifierSelect;

export type ModifierRecord = Prisma.ModifierGetPayload<{ select: typeof modifierSelect }>;

@Injectable()
export class ModifierGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    actor: AuthenticatedUser,
    dto: CreateModifierGroupDto,
  ): Promise<ModifierGroupRecord> {
    const restaurantId = requireRestaurantId(actor);
    const name = dto.name.trim();
    await this.assertNameAvailable(restaurantId, name);

    const isRequired = dto.isRequired ?? false;
    const minSelections = dto.minSelections ?? (isRequired ? 1 : 0);
    const maxSelections = dto.maxSelections ?? Math.max(1, minSelections);
    this.assertSelectionRules(isRequired, minSelections, maxSelections);

    return this.prisma.modifierGroup.create({
      data: {
        restaurantId,
        name,
        isRequired,
        minSelections,
        maxSelections,
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: groupInclude,
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: QueryModifierGroupsDto,
  ): Promise<PaginatedResult<ModifierGroupRecord>> {
    const restaurantId = requireRestaurantId(actor);

    const where: Prisma.ModifierGroupWhereInput = {
      restaurantId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.modifierGroup.findMany({
        where,
        include: groupInclude,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.modifierGroup.count({ where }),
    ]);

    return paginated(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<ModifierGroupRecord> {
    const restaurantId = requireRestaurantId(actor);

    const group = await this.prisma.modifierGroup.findFirst({
      where: { id, restaurantId },
      include: groupInclude,
    });

    if (!group) {
      throw new NotFoundException('Grupo de modificadores no encontrado');
    }

    return group;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateModifierGroupDto,
  ): Promise<ModifierGroupRecord> {
    const restaurantId = requireRestaurantId(actor);
    const group = await this.findOne(actor, id);
    const name = dto.name !== undefined ? dto.name.trim() : undefined;

    if (name && name !== group.name) {
      await this.assertNameAvailable(restaurantId, name, group.id);
    }

    const isRequired = dto.isRequired ?? group.isRequired;
    const minSelections = dto.minSelections ?? group.minSelections;
    const maxSelections = dto.maxSelections ?? group.maxSelections;
    this.assertSelectionRules(isRequired, minSelections, maxSelections);

    return this.prisma.modifierGroup.update({
      where: { id: group.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.isRequired !== undefined ? { isRequired } : {}),
        ...(dto.minSelections !== undefined ? { minSelections } : {}),
        ...(dto.maxSelections !== undefined ? { maxSelections } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: groupInclude,
    });
  }

  /** Soft delete del grupo. */
  async deactivate(actor: AuthenticatedUser, id: string): Promise<ModifierGroupRecord> {
    const group = await this.findOne(actor, id);

    return this.prisma.modifierGroup.update({
      where: { id: group.id },
      data: { isActive: false },
      include: groupInclude,
    });
  }

  async listModifiers(actor: AuthenticatedUser, groupId: string): Promise<ModifierRecord[]> {
    const group = await this.getGroup(actor, groupId);

    return this.prisma.modifier.findMany({
      where: { groupId: group.id, restaurantId: group.restaurantId },
      select: modifierSelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createModifier(
    actor: AuthenticatedUser,
    groupId: string,
    dto: CreateModifierDto,
  ): Promise<ModifierRecord> {
    const group = await this.getGroup(actor, groupId);
    const name = dto.name.trim();
    await this.assertModifierNameAvailable(group.id, name);

    return this.prisma.modifier.create({
      data: {
        restaurantId: group.restaurantId,
        groupId: group.id,
        name,
        ...(dto.extraPrice !== undefined ? { extraPrice: dto.extraPrice } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: modifierSelect,
    });
  }

  async updateModifier(
    actor: AuthenticatedUser,
    groupId: string,
    modifierId: string,
    dto: UpdateModifierDto,
  ): Promise<ModifierRecord> {
    const group = await this.getGroup(actor, groupId);
    const modifier = await this.getModifier(group.id, group.restaurantId, modifierId);
    const name = dto.name !== undefined ? dto.name.trim() : undefined;

    if (name && name !== modifier.name) {
      await this.assertModifierNameAvailable(group.id, name, modifier.id);
    }

    return this.prisma.modifier.update({
      where: { id: modifier.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.extraPrice !== undefined ? { extraPrice: dto.extraPrice } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: modifierSelect,
    });
  }

  /** Soft delete del modificador. */
  async deactivateModifier(
    actor: AuthenticatedUser,
    groupId: string,
    modifierId: string,
  ): Promise<ModifierRecord> {
    const group = await this.getGroup(actor, groupId);
    const modifier = await this.getModifier(group.id, group.restaurantId, modifierId);

    return this.prisma.modifier.update({
      where: { id: modifier.id },
      data: { isActive: false },
      select: modifierSelect,
    });
  }

  private assertSelectionRules(
    isRequired: boolean,
    minSelections: number,
    maxSelections: number,
  ): void {
    if (minSelections < 0 || maxSelections < 0) {
      throw new BadRequestException('Las selecciones no pueden ser negativas');
    }
    if (maxSelections < minSelections) {
      throw new BadRequestException('El máximo no puede ser menor que el mínimo');
    }
    if (isRequired && minSelections < 1) {
      throw new BadRequestException('Un grupo obligatorio debe exigir al menos una selección');
    }
  }

  private async getGroup(actor: AuthenticatedUser, id: string) {
    const restaurantId = requireRestaurantId(actor);

    const group = await this.prisma.modifierGroup.findFirst({
      where: { id, restaurantId },
      select: { id: true, restaurantId: true, name: true },
    });

    if (!group) {
      throw new NotFoundException('Grupo de modificadores no encontrado');
    }

    return group;
  }

  private async getModifier(groupId: string, restaurantId: string, modifierId: string) {
    const modifier = await this.prisma.modifier.findFirst({
      where: { id: modifierId, groupId, restaurantId },
      select: { id: true, name: true },
    });

    if (!modifier) {
      throw new NotFoundException('Modificador no encontrado');
    }

    return modifier;
  }

  private async assertNameAvailable(
    restaurantId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.modifierGroup.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Ya existe un grupo con ese nombre');
    }
  }

  private async assertModifierNameAvailable(
    groupId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.modifier.findFirst({
      where: {
        groupId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Ya existe un modificador con ese nombre en el grupo');
    }
  }
}
