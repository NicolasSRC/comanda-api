import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderItemStatus,
  OrderStatus,
  PreparationArea,
  Prisma,
  Role,
  TableStatus,
} from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { AuditService } from '../audit/audit.service';
import { MenuPricingService, type ClockParts } from '../catalog/pricing/menu-pricing.service';
import { EventsService } from '../events/events.service';
import type {
  AddOrderItemsDto,
  CancelOrderItemDto,
  ChangeOrderItemStatusDto,
  CreateOrderDto,
  CreateOrderItemDto,
  MergeOrdersDto,
  MoveOrderDto,
  QueryAreaItemsDto,
  QueryOrdersDto,
} from './dto/order.dto';
import type { OpenTableDto } from './dto/table.dto';
import {
  type CalculatedOrderItem,
  OrderItemCalculatorService,
  type OrderProductPricingSource,
} from './order-item-calculator.service';
import { OrderStatusService } from './order-status.service';

export const orderDetailInclude = {
  table: {
    select: {
      id: true,
      name: true,
      capacity: true,
      status: true,
      zone: { select: { id: true, name: true } },
    },
  },
  waiter: { select: { id: true, fullName: true, email: true } },
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      modifiers: { orderBy: { nameSnapshot: 'asc' } },
    },
  },
} satisfies Prisma.OrderInclude;

export const orderListSelect = {
  id: true,
  restaurantId: true,
  tableId: true,
  waiterId: true,
  status: true,
  guests: true,
  notes: true,
  openedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  table: {
    select: {
      id: true,
      name: true,
      status: true,
      zone: { select: { id: true, name: true } },
    },
  },
  waiter: { select: { id: true, fullName: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

export const itemDetailInclude = {
  modifiers: { orderBy: { nameSnapshot: 'asc' } },
  order: { select: { id: true, tableId: true, status: true } },
  product: { select: { id: true, name: true } },
  variant: { select: { id: true, name: true } },
  cancelledBy: { select: { id: true, fullName: true } },
} satisfies Prisma.OrderItemInclude;

export const queueItemInclude = {
  modifiers: { orderBy: { nameSnapshot: 'asc' } },
  order: {
    select: {
      id: true,
      guests: true,
      openedAt: true,
      table: {
        select: {
          id: true,
          name: true,
          zone: { select: { id: true, name: true } },
        },
      },
      waiter: { select: { id: true, fullName: true } },
    },
  },
} satisfies Prisma.OrderItemInclude;

type OrderDetailRecord = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;
type OrderItemRecord = Prisma.OrderItemGetPayload<{ include: typeof itemDetailInclude }>;
type QueueItemRecord = Prisma.OrderItemGetPayload<{ include: typeof queueItemInclude }>;
export type OrderListItem = Prisma.OrderGetPayload<{ select: typeof orderListSelect }>;

type WithPreparationSeconds<T> = T & { preparationSeconds: number | null };

export type OrderResponse = Omit<OrderDetailRecord, 'items'> & {
  total: number;
  items: Array<WithPreparationSeconds<OrderDetailRecord['items'][number]>>;
};

export type OrderItemResponse = WithPreparationSeconds<OrderItemRecord>;
export type QueueItemResponse = WithPreparationSeconds<QueueItemRecord>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: MenuPricingService,
    private readonly calculator: OrderItemCalculatorService,
    private readonly statuses: OrderStatusService,
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
  ) {}

  /** RF-32: abre una mesa creando un pedido vacío asignado a un mesero. */
  async openTable(
    actor: AuthenticatedUser,
    tableId: string,
    dto: OpenTableDto,
  ): Promise<OrderResponse> {
    const restaurantId = requireRestaurantId(actor);
    const table = await this.getTable(restaurantId, tableId);
    await this.assertTableFree(restaurantId, table);
    const waiterId = await this.resolveWaiter(restaurantId, actor, dto.meseroId);

    const order = await this.prisma.$transaction(async (tx) => {
      const open = await tx.order.findFirst({
        where: { restaurantId, tableId: table.id, status: OrderStatus.OPEN },
        select: { id: true },
      });
      if (open) {
        throw new ConflictException('La mesa ya tiene un pedido abierto');
      }

      const created = await tx.order.create({
        data: {
          restaurantId,
          tableId: table.id,
          waiterId,
          guests: dto.comensales,
          ...(dto.notas !== undefined ? { notes: dto.notas.trim() } : {}),
        },
        select: { id: true },
      });

      await tx.restaurantTable.update({
        where: { id: table.id },
        data: { status: TableStatus.OCCUPIED },
      });

      await this.accounts.ensureForOrder(tx, {
        restaurantId,
        tableId: table.id,
        orderId: created.id,
        openedById: actor.id,
      });
      await this.accounts.syncForOrder(tx, created.id);

      return created;
    });

    const detail = await this.findOne(actor, order.id);
    this.events.publish({
      type: 'order.opened',
      restaurantId,
      orderId: order.id,
      tableId: table.id,
      itemId: null,
      status: OrderStatus.OPEN,
    });
    return detail;
  }

  /** RF-40/RF-42: crea un pedido con sus ítems y precios congelados. */
  async create(actor: AuthenticatedUser, dto: CreateOrderDto): Promise<OrderResponse> {
    const restaurantId = requireRestaurantId(actor);
    const restaurant = await this.getRestaurant(restaurantId);
    const table = await this.getTable(restaurantId, dto.mesaId);
    await this.assertTableFree(restaurantId, table);

    const now = this.pricing.getClockParts(new Date(), restaurant.timezone);
    const items = await this.buildItems(restaurantId, dto.items, now);

    const order = await this.prisma.$transaction(async (tx) => {
      const open = await tx.order.findFirst({
        where: { restaurantId, tableId: table.id, status: OrderStatus.OPEN },
        select: { id: true },
      });
      if (open) {
        throw new ConflictException('La mesa ya tiene un pedido abierto');
      }

      const created = await tx.order.create({
        data: {
          restaurantId,
          tableId: table.id,
          waiterId: actor.id,
          guests: dto.comensales,
          ...(dto.notas !== undefined ? { notes: dto.notas.trim() } : {}),
          items: {
            create: items.map((item) => this.toOrderItemCreate(restaurantId, item)),
          },
        },
        select: { id: true },
      });

      await tx.restaurantTable.update({
        where: { id: table.id },
        data: { status: TableStatus.OCCUPIED },
      });

      await this.accounts.ensureForOrder(tx, {
        restaurantId,
        tableId: table.id,
        orderId: created.id,
        openedById: actor.id,
      });
      await this.accounts.syncForOrder(tx, created.id);

      return created;
    });

    const detail = await this.findOne(actor, order.id);
    this.events.publish({
      type: 'order.opened',
      restaurantId,
      orderId: order.id,
      tableId: table.id,
      itemId: null,
      status: OrderStatus.OPEN,
    });
    return detail;
  }

  async list(
    actor: AuthenticatedUser,
    query: QueryOrdersDto,
  ): Promise<PaginatedResult<OrderListItem>> {
    const restaurantId = requireRestaurantId(actor);

    const where: Prisma.OrderWhereInput = {
      restaurantId,
      ...(query.mesaId ? { tableId: query.mesaId } : {}),
      ...(query.estado ? { status: query.estado } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: orderListSelect,
        orderBy: { openedAt: 'desc' },
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginated(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<OrderResponse> {
    const restaurantId = requireRestaurantId(actor);

    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId },
      include: orderDetailInclude,
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.serializeOrder(order);
  }

  /** RF-43: agrega ítems nuevos a un pedido abierto; siempre nacen en PENDING. */
  async addItems(
    actor: AuthenticatedUser,
    orderId: string,
    dto: AddOrderItemsDto,
  ): Promise<OrderResponse> {
    const restaurantId = requireRestaurantId(actor);
    const order = await this.getOrderForOperation(restaurantId, orderId);

    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Solo se pueden agregar ítems a un pedido abierto');
    }

    const restaurant = await this.getRestaurant(restaurantId);
    const now = this.pricing.getClockParts(new Date(), restaurant.timezone);
    const items = await this.buildItems(restaurantId, dto.items, now);

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            ...this.toOrderItemCreate(restaurantId, item),
          },
        });
      }

      await this.accounts.syncForOrder(tx, order.id);
    });

    const detail = await this.findOne(actor, order.id);
    this.events.publish({
      type: 'items.created',
      restaurantId,
      orderId: order.id,
      tableId: order.tableId,
      itemId: null,
      status: OrderItemStatus.PENDING,
    });
    return detail;
  }

  /** RF-45: aplica una transición válida y registra los tiempos del ítem. */
  async changeItemStatus(
    actor: AuthenticatedUser,
    orderId: string,
    itemId: string,
    dto: ChangeOrderItemStatusDto,
  ): Promise<OrderItemResponse> {
    const restaurantId = requireRestaurantId(actor);
    const item = await this.getItemForOperation(restaurantId, orderId, itemId);

    if (item.order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('El pedido no está abierto');
    }
    if (dto.estado === OrderItemStatus.CANCELLED) {
      throw new BadRequestException('Usa el endpoint de cancelación para cancelar un ítem');
    }

    this.statuses.assertTransition(item.status, dto.estado);
    this.statuses.assertRoleForTransition(item.status, dto.estado, actor.role);

    const now = new Date();
    const updated = await this.prisma.orderItem.update({
      where: { id: item.id },
      data: {
        status: dto.estado,
        ...(dto.estado === OrderItemStatus.IN_PREPARATION
          ? { sentAt: item.sentAt ?? now, startedAt: item.startedAt ?? now }
          : {}),
        ...(dto.estado === OrderItemStatus.READY ? { readyAt: now } : {}),
        ...(dto.estado === OrderItemStatus.SERVED ? { servedAt: now } : {}),
      },
      include: itemDetailInclude,
    });

    const response = this.serializeItem(updated);
    this.events.publish({
      type: 'item.updated',
      restaurantId,
      orderId,
      tableId: item.order.tableId,
      itemId: item.id,
      status: dto.estado,
    });
    return response;
  }

  /** RF-44: cancelación con motivo y registro de quién y cuándo. */
  async cancelItem(
    actor: AuthenticatedUser,
    orderId: string,
    itemId: string,
    dto: CancelOrderItemDto,
  ): Promise<OrderItemResponse> {
    const restaurantId = requireRestaurantId(actor);
    const item = await this.getItemForOperation(restaurantId, orderId, itemId);

    if (item.order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('El pedido no está abierto');
    }

    this.statuses.assertCanCancel(item.status, actor.role);

    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.orderItem.update({
        where: { id: item.id },
        data: {
          status: OrderItemStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: actor.id,
          cancelReason: dto.motivo.trim(),
        },
        include: itemDetailInclude,
      });

      await this.accounts.syncForOrder(tx, orderId);

      await this.audit.record(tx, {
        restaurantId,
        userId: actor.id,
        action: 'CANCEL_ITEM',
        entityType: 'OrderItem',
        entityId: cancelled.id,
        before: {
          estado: item.status,
          cantidad: cancelled.quantity,
          producto: cancelled.productNameSnapshot,
          total: cancelled.lineTotal,
        },
        after: {
          estado: OrderItemStatus.CANCELLED,
          motivo: cancelled.cancelReason,
          canceladoEn: cancelled.cancelledAt,
        },
        metadata: { pedidoId: orderId, mesaId: cancelled.order.tableId },
      });

      return cancelled;
    });

    const response = this.serializeItem(updated);
    this.events.publish({
      type: 'item.updated',
      restaurantId,
      orderId,
      tableId: updated.order.tableId,
      itemId: updated.id,
      status: OrderItemStatus.CANCELLED,
    });
    return response;
  }

  /** RF-47: cola por área ordenada por antigüedad. */
  async areaQueue(
    actor: AuthenticatedUser,
    area: PreparationArea,
    query: QueryAreaItemsDto,
  ): Promise<PaginatedResult<QueueItemResponse>> {
    const restaurantId = requireRestaurantId(actor);
    const statuses = query.estado
      ? [query.estado]
      : [OrderItemStatus.PENDING, OrderItemStatus.IN_PREPARATION, OrderItemStatus.READY];

    const where: Prisma.OrderItemWhereInput = {
      restaurantId,
      preparationArea: area,
      status: { in: statuses },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.orderItem.findMany({
        where,
        include: queueItemInclude,
        orderBy: { createdAt: 'asc' },
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.orderItem.count({ where }),
    ]);

    return paginated(
      data.map((item) => this.serializeQueueItem(item)),
      total,
      query.page,
      query.limit,
    );
  }

  /** RF-33 (prioridad baja): mover un pedido abierto a otra mesa libre. */
  async move(actor: AuthenticatedUser, orderId: string, dto: MoveOrderDto): Promise<OrderResponse> {
    const restaurantId = requireRestaurantId(actor);
    const order = await this.getOrderForOperation(restaurantId, orderId);

    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Solo se pueden mover pedidos abiertos');
    }
    if (order.tableId === dto.mesaId) {
      throw new BadRequestException('El pedido ya está en esa mesa');
    }

    const target = await this.getTable(restaurantId, dto.mesaId);
    await this.assertTableFree(restaurantId, target);

    await this.prisma.$transaction(async (tx) => {
      await tx.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: TableStatus.FREE },
      });
      await tx.restaurantTable.update({
        where: { id: target.id },
        data: { status: TableStatus.OCCUPIED },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { tableId: target.id },
      });
      await this.accounts.moveForOrder(tx, order.id, target.id);
    });

    const detail = await this.findOne(actor, order.id);
    this.events.publish({
      type: 'order.updated',
      restaurantId,
      orderId: order.id,
      tableId: target.id,
      itemId: null,
      status: OrderStatus.OPEN,
    });
    return detail;
  }

  /** RF-33 (prioridad baja): unir los ítems de un pedido en otro pedido abierto. */
  async merge(
    actor: AuthenticatedUser,
    orderId: string,
    dto: MergeOrdersDto,
  ): Promise<OrderResponse> {
    const restaurantId = requireRestaurantId(actor);
    const source = await this.getOrderForOperation(restaurantId, orderId);
    const target = await this.getOrderForOperation(restaurantId, dto.pedidoDestinoId);

    if (source.id === target.id) {
      throw new BadRequestException('No se puede unir un pedido consigo mismo');
    }
    if (source.status !== OrderStatus.OPEN || target.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Ambos pedidos deben estar abiertos');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { orderId: source.id, restaurantId },
        data: { orderId: target.id },
      });
      await tx.order.update({
        where: { id: source.id },
        data: { status: OrderStatus.CANCELLED, closedAt: new Date() },
      });
      await tx.restaurantTable.update({
        where: { id: source.tableId },
        data: { status: TableStatus.FREE },
      });
      await this.accounts.voidForMerge(tx, source.id, actor);
      await this.accounts.syncForOrder(tx, target.id);
    });

    const detail = await this.findOne(actor, target.id);
    this.events.publish({
      type: 'order.updated',
      restaurantId,
      orderId: target.id,
      tableId: target.tableId,
      itemId: null,
      status: OrderStatus.OPEN,
    });
    return detail;
  }

  private async buildItems(
    restaurantId: string,
    selections: CreateOrderItemDto[],
    now: ClockParts,
  ): Promise<CalculatedOrderItem[]> {
    const productIds = [...new Set(selections.map((selection) => selection.productoId))];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, restaurantId },
      include: {
        variants: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        priceRules: true,
        availabilityWindows: true,
        modifierGroups: {
          include: {
            group: {
              include: {
                modifiers: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
              },
            },
          },
        },
      },
    });

    const byId = new Map(products.map((product) => [product.id, product]));

    return selections.map((selection) => {
      const product = byId.get(selection.productoId);
      if (!product) {
        throw new BadRequestException('Producto no encontrado en el restaurante');
      }

      const source: OrderProductPricingSource = {
        id: product.id,
        name: product.name,
        basePrice: product.basePrice,
        preparationArea: product.preparationArea,
        isActive: product.isActive,
        isAvailable: product.isAvailable,
        variants: product.variants,
        priceRules: product.priceRules,
        availabilityWindows: product.availabilityWindows,
        modifierGroups: product.modifierGroups
          .filter((link) => link.group.isActive)
          .map((link) => ({
            id: link.group.id,
            name: link.group.name,
            isRequired: link.group.isRequired,
            minSelections: link.group.minSelections,
            maxSelections: link.group.maxSelections,
            modifiers: link.group.modifiers
              .filter((modifier) => modifier.isActive)
              .map((modifier) => ({
                id: modifier.id,
                name: modifier.name,
                extraPrice: modifier.extraPrice,
              })),
          })),
      };

      return this.calculator.calculate(
        source,
        {
          variantId: selection.varianteId ?? null,
          quantity: selection.cantidad,
          modifiers: (selection.modificadores ?? []).map((modifier) => ({
            modifierId: modifier.modificadorId,
            quantity: modifier.cantidad ?? 1,
          })),
          notes: selection.notas ?? null,
        },
        now,
      );
    });
  }

  private toOrderItemCreate(restaurantId: string, item: CalculatedOrderItem) {
    return {
      restaurantId,
      productId: item.productId,
      variantId: item.variantId,
      productNameSnapshot: item.productNameSnapshot,
      variantNameSnapshot: item.variantNameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      modifiersTotal: item.modifiersTotal,
      lineTotal: item.lineTotal,
      notes: item.notes,
      preparationArea: item.preparationArea,
      modifiers: {
        create: item.modifiers.map((modifier) => ({
          restaurantId,
          modifierId: modifier.modifierId,
          nameSnapshot: modifier.nameSnapshot,
          extraPrice: modifier.extraPrice,
          quantity: modifier.quantity,
        })),
      },
    };
  }

  private async getRestaurant(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, timezone: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado');
    }

    return restaurant;
  }

  private async getTable(restaurantId: string, tableId: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, restaurantId },
      select: {
        id: true,
        name: true,
        capacity: true,
        status: true,
        zone: { select: { id: true, name: true, isActive: true } },
      },
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }
    if (!table.zone.isActive) {
      throw new BadRequestException('La zona de la mesa está inactiva');
    }

    return table;
  }

  private async assertTableFree(
    restaurantId: string,
    table: { id: string; status: TableStatus },
  ): Promise<void> {
    if (table.status !== TableStatus.FREE) {
      throw new ConflictException('La mesa no está libre');
    }

    const open = await this.prisma.order.findFirst({
      where: { restaurantId, tableId: table.id, status: OrderStatus.OPEN },
      select: { id: true },
    });

    if (open) {
      throw new ConflictException('La mesa ya tiene un pedido abierto');
    }
  }

  private async resolveWaiter(
    restaurantId: string,
    actor: AuthenticatedUser,
    waiterId?: string,
  ): Promise<string> {
    if (!waiterId || waiterId === actor.id) {
      return actor.id;
    }

    const waiter = await this.prisma.user.findFirst({
      where: {
        id: waiterId,
        restaurantId,
        isActive: true,
        role: { in: [Role.WAITER, Role.ADMIN] },
      },
      select: { id: true },
    });

    if (!waiter) {
      throw new BadRequestException('El mesero indicado no es válido');
    }

    return waiter.id;
  }

  private async getOrderForOperation(restaurantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      select: { id: true, tableId: true, status: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return order;
  }

  private async getItemForOperation(restaurantId: string, orderId: string, itemId: string) {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId, restaurantId },
      select: {
        id: true,
        status: true,
        sentAt: true,
        startedAt: true,
        order: { select: { id: true, tableId: true, status: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Ítem del pedido no encontrado');
    }

    return item;
  }

  private serializeOrder(order: OrderDetailRecord): OrderResponse {
    return {
      ...order,
      total: order.items
        .filter((item) => item.status !== OrderItemStatus.CANCELLED)
        .reduce((sum, item) => sum + item.lineTotal, 0),
      items: order.items.map((item) => ({
        ...item,
        preparationSeconds: preparationSeconds(item),
      })),
    };
  }

  private serializeItem(item: OrderItemRecord): OrderItemResponse {
    return {
      ...item,
      preparationSeconds: preparationSeconds(item),
    };
  }

  private serializeQueueItem(item: QueueItemRecord): QueueItemResponse {
    return {
      ...item,
      preparationSeconds: preparationSeconds(item),
    };
  }
}

function preparationSeconds(item: { startedAt: Date | null; readyAt: Date | null }): number | null {
  if (!item.startedAt || !item.readyAt) {
    return null;
  }

  return Math.max(0, Math.round((item.readyAt.getTime() - item.startedAt.getTime()) / 1000));
}
