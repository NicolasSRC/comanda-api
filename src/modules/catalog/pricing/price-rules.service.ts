import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../../common/utils/tenant';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { MenuPricingService } from './menu-pricing.service';
import type {
  CreateAvailabilityWindowDto,
  CreatePriceRuleDto,
  UpdatePriceRuleDto,
} from '../dto/price-rule.dto';

const priceRuleSelect = {
  id: true,
  restaurantId: true,
  productId: true,
  variantId: true,
  name: true,
  price: true,
  daysOfWeek: true,
  startTime: true,
  endTime: true,
  priority: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PriceRuleSelect;

export type PriceRuleRecord = Prisma.PriceRuleGetPayload<{ select: typeof priceRuleSelect }>;

const availabilitySelect = {
  id: true,
  restaurantId: true,
  productId: true,
  daysOfWeek: true,
  startTime: true,
  endTime: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AvailabilityWindowSelect;

export type AvailabilityWindowRecord = Prisma.AvailabilityWindowGetPayload<{
  select: typeof availabilitySelect;
}>;

@Injectable()
export class PriceRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: MenuPricingService,
    private readonly audit: AuditService,
  ) {}

  async listRules(actor: AuthenticatedUser, productId: string): Promise<PriceRuleRecord[]> {
    const product = await this.getProduct(actor, productId);

    return this.prisma.priceRule.findMany({
      where: { productId: product.id, restaurantId: product.restaurantId },
      select: priceRuleSelect,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }

  async createRule(
    actor: AuthenticatedUser,
    productId: string,
    dto: CreatePriceRuleDto,
  ): Promise<PriceRuleRecord> {
    const product = await this.getProduct(actor, productId);
    if (dto.variantId) {
      await this.assertVariant(product.id, product.restaurantId, dto.variantId);
    }

    this.assertTime(dto.startTime);
    this.assertTime(dto.endTime);
    if (dto.daysOfWeek !== undefined) {
      this.assertDays(dto.daysOfWeek);
    }

    const name = dto.name.trim();
    await this.assertNameAvailable(product.id, name);

    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.priceRule.create({
        data: {
          restaurantId: product.restaurantId,
          productId: product.id,
          variantId: dto.variantId ?? null,
          name,
          price: dto.price,
          ...(dto.daysOfWeek !== undefined ? { daysOfWeek: dto.daysOfWeek } : {}),
          startTime: dto.startTime,
          endTime: dto.endTime,
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: priceRuleSelect,
      });

      await this.audit.record(tx, {
        restaurantId: product.restaurantId,
        userId: actor.id,
        action: 'CREATE_PRICE_RULE',
        entityType: 'PriceRule',
        entityId: rule.id,
        after: {
          productoId: product.id,
          varianteId: rule.variantId,
          nombre: rule.name,
          precio: rule.price,
          diasSemana: rule.daysOfWeek,
          horaInicio: rule.startTime,
          horaFin: rule.endTime,
          prioridad: rule.priority,
        },
      });

      return rule;
    });
  }

  async updateRule(
    actor: AuthenticatedUser,
    productId: string,
    ruleId: string,
    dto: UpdatePriceRuleDto,
  ): Promise<PriceRuleRecord> {
    const product = await this.getProduct(actor, productId);
    const rule = await this.getRule(product.id, product.restaurantId, ruleId);

    if (dto.variantId !== undefined && dto.variantId !== null) {
      await this.assertVariant(product.id, product.restaurantId, dto.variantId);
    }

    const startTime = dto.startTime ?? rule.startTime;
    const endTime = dto.endTime ?? rule.endTime;
    this.assertTime(startTime);
    this.assertTime(endTime);
    if (dto.daysOfWeek !== undefined) {
      this.assertDays(dto.daysOfWeek);
    }

    const name = dto.name !== undefined ? dto.name.trim() : undefined;
    if (name && name !== rule.name) {
      await this.assertNameAvailable(product.id, name, rule.id);
    }

    const priceChanged = dto.price !== undefined && dto.price !== rule.price;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.priceRule.update({
        where: { id: rule.id },
        data: {
          ...(dto.variantId !== undefined ? { variantId: dto.variantId } : {}),
          ...(name !== undefined ? { name } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.daysOfWeek !== undefined ? { daysOfWeek: dto.daysOfWeek } : {}),
          ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
          ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: priceRuleSelect,
      });

      if (priceChanged) {
        await this.audit.record(tx, {
          restaurantId: product.restaurantId,
          userId: actor.id,
          action: 'UPDATE_PRICE_RULE',
          entityType: 'PriceRule',
          entityId: rule.id,
          before: { precio: rule.price },
          after: { precio: updated.price },
          metadata: { productoId: product.id, nombre: updated.name },
        });
      }

      return updated;
    });
  }

  /** Soft delete de la regla. */
  async deactivateRule(
    actor: AuthenticatedUser,
    productId: string,
    ruleId: string,
  ): Promise<PriceRuleRecord> {
    const product = await this.getProduct(actor, productId);
    const rule = await this.getRule(product.id, product.restaurantId, ruleId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.priceRule.update({
        where: { id: rule.id },
        data: { isActive: false },
        select: priceRuleSelect,
      });

      await this.audit.record(tx, {
        restaurantId: product.restaurantId,
        userId: actor.id,
        action: 'DEACTIVATE_PRICE_RULE',
        entityType: 'PriceRule',
        entityId: rule.id,
        before: { activa: rule.isActive, precio: rule.price },
        after: { activa: false },
        metadata: { productoId: product.id, nombre: rule.name },
      });

      return updated;
    });
  }

  async listWindows(
    actor: AuthenticatedUser,
    productId: string,
  ): Promise<AvailabilityWindowRecord[]> {
    const product = await this.getProduct(actor, productId);

    return this.prisma.availabilityWindow.findMany({
      where: { productId: product.id, restaurantId: product.restaurantId },
      select: availabilitySelect,
      orderBy: [{ daysOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async createWindow(
    actor: AuthenticatedUser,
    productId: string,
    dto: CreateAvailabilityWindowDto,
  ): Promise<AvailabilityWindowRecord> {
    const product = await this.getProduct(actor, productId);
    this.assertTime(dto.startTime);
    this.assertTime(dto.endTime);
    if (dto.daysOfWeek !== undefined) {
      this.assertDays(dto.daysOfWeek);
    }

    return this.prisma.availabilityWindow.create({
      data: {
        restaurantId: product.restaurantId,
        productId: product.id,
        ...(dto.daysOfWeek !== undefined ? { daysOfWeek: dto.daysOfWeek } : {}),
        startTime: dto.startTime,
        endTime: dto.endTime,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: availabilitySelect,
    });
  }

  async deactivateWindow(
    actor: AuthenticatedUser,
    productId: string,
    windowId: string,
  ): Promise<AvailabilityWindowRecord> {
    const product = await this.getProduct(actor, productId);

    const window = await this.prisma.availabilityWindow.findFirst({
      where: { id: windowId, productId: product.id, restaurantId: product.restaurantId },
      select: { id: true },
    });
    if (!window) {
      throw new NotFoundException('Ventana de disponibilidad no encontrada');
    }

    return this.prisma.availabilityWindow.update({
      where: { id: window.id },
      data: { isActive: false },
      select: availabilitySelect,
    });
  }

  private assertTime(value: string): void {
    try {
      this.pricing.timeToMinutes(value);
    } catch {
      throw new BadRequestException(`La hora "${value}" no es válida. Usa el formato HH:mm`);
    }
  }

  private assertDays(value: number): void {
    if (!Number.isInteger(value) || value < 1 || value > 127) {
      throw new BadRequestException('Los días deben ser una máscara entre 1 y 127');
    }
  }

  private async getProduct(actor: AuthenticatedUser, id: string) {
    const restaurantId = requireRestaurantId(actor);

    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
      select: { id: true, restaurantId: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  private async getRule(productId: string, restaurantId: string, ruleId: string) {
    const rule = await this.prisma.priceRule.findFirst({
      where: { id: ruleId, productId, restaurantId },
      select: { id: true, name: true, price: true, isActive: true, startTime: true, endTime: true },
    });

    if (!rule) {
      throw new NotFoundException('Regla de precio no encontrada');
    }

    return rule;
  }

  private async assertVariant(
    productId: string,
    restaurantId: string,
    variantId: string,
  ): Promise<void> {
    const variant = await this.prisma.variant.findFirst({
      where: { id: variantId, productId, restaurantId },
      select: { id: true },
    });

    if (!variant) {
      throw new NotFoundException('Variante no encontrada para el producto');
    }
  }

  private async assertNameAvailable(
    productId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await this.prisma.priceRule.findFirst({
      where: {
        productId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Ya existe una regla de precio con ese nombre');
    }
  }
}
