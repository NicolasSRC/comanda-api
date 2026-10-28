import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  DiscountScope,
  DiscountType,
  OrderStatus,
  PaymentMethod,
  Prisma,
  Role,
  TableStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AccountCalculatorService,
  type AccountCalculation,
  distributeAmounts,
  distributeEqually,
} from './account-calculator.service';
import type {
  CreateDiscountDto,
  CreatePaymentDto,
  CreateSplitsDto,
  SplitGroupDto,
  UpdateTipDto,
} from './dto/account.dto';

const accountInclude = {
  order: {
    select: {
      id: true,
      tableId: true,
      status: true,
      guests: true,
      waiterId: true,
    },
  },
  table: {
    select: {
      id: true,
      name: true,
      status: true,
      zone: { select: { id: true, name: true } },
    },
  },
  openedBy: { select: { id: true, fullName: true } },
  closedBy: { select: { id: true, fullName: true } },
  voidedBy: { select: { id: true, fullName: true } },
  discounts: {
    orderBy: { createdAt: 'asc' },
    include: {
      appliedBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
      orderItem: { select: { id: true, productNameSnapshot: true } },
    },
  },
  payments: {
    orderBy: { createdAt: 'asc' },
    include: {
      receivedBy: { select: { id: true, fullName: true } },
      split: { select: { id: true, label: true } },
    },
  },
  splits: {
    orderBy: { createdAt: 'asc' },
    include: {
      items: {
        orderBy: { orderItemId: 'asc' },
        include: {
          orderItem: { select: { id: true, productNameSnapshot: true } },
        },
      },
    },
  },
} satisfies Prisma.AccountInclude;

const restaurantAccountSelect = {
  pricesIncludeTax: true,
  tipEnabled: true,
  tipSuggestedBps: true,
  tipBase: true,
  discountApprovalThresholdBps: true,
} satisfies Prisma.RestaurantSelect;

type AccountRecord = Prisma.AccountGetPayload<{ include: typeof accountInclude }>;
type RestaurantAccountConfig = Prisma.RestaurantGetPayload<{
  select: typeof restaurantAccountSelect;
}>;

export interface AccountDetail {
  id: string;
  estado: AccountStatus;
  mesaId: string;
  mesa: string;
  zona: string;
  pedidoId: string;
  comensales: number;
  abiertaEn: Date;
  cerradaEn: Date | null;
  anuladaEn: Date | null;
  motivoAnulacion: string | null;
  abiertaPor: { id: string; fullName: string };
  cerradaPor: { id: string; fullName: string } | null;
  anuladaPor: { id: string; fullName: string } | null;
  subtotal: number;
  descuentos: number;
  impuestos: number;
  propina: number;
  total: number;
  pagado: number;
  saldo: number;
  propinaBps: number;
  propinaSugeridaBps: number;
  propinaHabilitada: boolean;
  preciosIncluyenImpuesto: boolean;
  lineas: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    total: number;
    descuento: number;
    neto: number;
  }>;
  impuestosDetalle: Array<{ id: string; nombre: string; tasaBps: number; monto: number }>;
  descuentosDetalle: Array<{
    id: string;
    itemId: string | null;
    itemNombre: string | null;
    alcance: DiscountScope;
    tipo: DiscountType;
    valor: number;
    motivo: string;
    aplicadoPor: { id: string; fullName: string };
    aprobadoPor: { id: string; fullName: string } | null;
    aprobado: boolean;
    creadoEn: Date;
  }>;
  pagos: Array<{
    id: string;
    metodo: PaymentMethod;
    monto: number;
    referencia: string | null;
    divisionId: string | null;
    division: string | null;
    recibidoPor: { id: string; fullName: string };
    creadoEn: Date;
  }>;
  divisiones: Array<{
    id: string;
    etiqueta: string;
    monto: number;
    items: Array<{
      itemId: string;
      nombre: string;
      cantidad: number;
      monto: number;
    }>;
  }>;
}

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: AccountCalculatorService,
    private readonly audit: AuditService,
  ) {}

  /** Crea la cuenta que acompaña a un pedido recién abierto (RF-50). */
  async ensureForOrder(
    tx: Prisma.TransactionClient,
    input: { restaurantId: string; tableId: string; orderId: string; openedById: string },
  ): Promise<void> {
    const existing = await tx.account.findUnique({
      where: { orderId: input.orderId },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    await tx.account.create({ data: input });
  }

  /** Recalcula la cuenta de un pedido tras un cambio de ítems o de mesa. */
  async syncForOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
    const order = await tx.order.findFirst({
      where: { id: orderId },
      select: {
        id: true,
        restaurantId: true,
        tableId: true,
        waiterId: true,
        status: true,
      },
    });

    if (!order) {
      return;
    }

    let account = await tx.account.findFirst({
      where: { orderId: order.id },
      include: accountInclude,
    });

    if (!account) {
      if (order.status !== OrderStatus.OPEN) {
        return;
      }

      await tx.account.create({
        data: {
          restaurantId: order.restaurantId,
          tableId: order.tableId,
          orderId: order.id,
          openedById: order.waiterId,
        },
      });
      account = await tx.account.findFirst({
        where: { orderId: order.id },
        include: accountInclude,
      });
    }

    if (!account || account.status !== AccountStatus.OPEN) {
      return;
    }

    await this.recalculate(tx, account);
  }

  /** Mantiene la cuenta apuntando a la mesa actual cuando se mueve un pedido. */
  async moveForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    tableId: string,
  ): Promise<void> {
    await tx.account.updateMany({
      where: { orderId, status: AccountStatus.OPEN },
      data: { tableId },
    });
  }

  /**
   * Anula la cuenta de un pedido origen de una unión (RF-33).
   * Solo se permite si la cuenta no tiene movimientos financieros.
   */
  async voidForMerge(
    tx: Prisma.TransactionClient,
    orderId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const account = await tx.account.findFirst({
      where: { orderId },
      select: {
        id: true,
        status: true,
        _count: { select: { payments: true, discounts: true } },
      },
    });

    if (!account || account.status !== AccountStatus.OPEN) {
      return;
    }
    if (account._count.payments > 0 || account._count.discounts > 0) {
      throw new ConflictException(
        'No se puede unir un pedido con pagos o descuentos registrados en su cuenta',
      );
    }

    await tx.split.deleteMany({ where: { accountId: account.id } });
    await tx.account.update({
      where: { id: account.id },
      data: {
        status: AccountStatus.VOIDED,
        voidedById: actor.id,
        voidedAt: new Date(),
        voidReason: 'Pedido unido a otro',
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        tipTotal: 0,
        total: 0,
        paidTotal: 0,
        tipBps: 0,
      },
    });
  }

  async detail(actor: AuthenticatedUser, id: string): Promise<AccountDetail> {
    const restaurantId = requireRestaurantId(actor);

    return this.prisma.$transaction(async (tx) => {
      const account = await this.loadAccount(tx, restaurantId, id);
      return this.buildDetail(tx, account);
    });
  }

  /** Cuenta abierta de una mesa (GET /cuentas?mesaId=). */
  async findByTable(actor: AuthenticatedUser, tableId: string): Promise<AccountDetail> {
    const restaurantId = requireRestaurantId(actor);

    return this.prisma.$transaction(async (tx) => {
      const table = await tx.restaurantTable.findFirst({
        where: { id: tableId, restaurantId },
        select: { id: true },
      });
      if (!table) {
        throw new NotFoundException('Mesa no encontrada');
      }

      const account = await tx.account.findFirst({
        where: {
          restaurantId,
          tableId,
          status: AccountStatus.OPEN,
        },
        include: accountInclude,
      });
      if (!account) {
        throw new NotFoundException('La mesa no tiene una cuenta abierta');
      }

      return this.buildDetail(tx, account);
    });
  }

  /** RF-53: descuento por ítem o por cuenta, con motivo y umbral de aprobación. */
  async applyDiscount(
    actor: AuthenticatedUser,
    accountId: string,
    dto: CreateDiscountDto,
  ): Promise<AccountDetail> {
    const restaurantId = requireRestaurantId(actor);

    return this.prisma.$transaction(async (tx) => {
      const account = await this.loadAccount(tx, restaurantId, accountId);
      this.assertOpen(account);

      if (dto.alcance === DiscountScope.ITEM && !dto.itemId) {
        throw new BadRequestException('Debes indicar el ítem del descuento');
      }
      if (dto.alcance === DiscountScope.ACCOUNT && dto.itemId) {
        throw new BadRequestException('Un descuento de cuenta no debe incluir itemId');
      }

      const { calculation, restaurant } = await this.compute(tx, account);
      const base = this.discountBase(calculation, dto);
      const effectiveBps = this.effectiveDiscountBps(dto, base);

      if (effectiveBps > restaurant.discountApprovalThresholdBps && actor.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'El descuento supera el umbral configurado y requiere aprobación de un administrador',
        );
      }

      const approvedById =
        actor.role === Role.ADMIN && effectiveBps > restaurant.discountApprovalThresholdBps
          ? actor.id
          : null;

      const discount = await tx.discount.create({
        data: {
          restaurantId,
          accountId: account.id,
          orderItemId: dto.alcance === DiscountScope.ITEM ? dto.itemId : null,
          scope: dto.alcance,
          type: dto.tipo,
          value: dto.valor,
          reason: dto.motivo.trim(),
          appliedById: actor.id,
          ...(approvedById ? { approvedById } : {}),
        },
      });

      await this.audit.record(tx, {
        restaurantId,
        userId: actor.id,
        action: 'APPLY_DISCOUNT',
        entityType: 'Discount',
        entityId: discount.id,
        after: {
          cuentaId: account.id,
          itemId: discount.orderItemId,
          alcance: discount.scope,
          tipo: discount.type,
          valor: discount.value,
          motivo: discount.reason,
          base,
          descuentoBps: effectiveBps,
          aprobadoPorId: approvedById,
        },
      });

      return this.refreshDetail(tx, restaurantId, account.id);
    });
  }

  /** RF-52: aplica, cambia o retira la propina de la cuenta. */
  async updateTip(
    actor: AuthenticatedUser,
    accountId: string,
    dto: UpdateTipDto,
  ): Promise<AccountDetail> {
    const restaurantId = requireRestaurantId(actor);

    return this.prisma.$transaction(async (tx) => {
      const account = await this.loadAccount(tx, restaurantId, accountId);
      this.assertOpen(account);

      const restaurant = await this.getRestaurantConfig(tx, restaurantId);
      if (!restaurant.tipEnabled && dto.porcentajeBps > 0) {
        throw new BadRequestException('La propina está deshabilitada para este restaurante');
      }

      await tx.account.update({
        where: { id: account.id },
        data: { tipBps: dto.porcentajeBps },
      });

      return this.refreshDetail(tx, restaurantId, account.id);
    });
  }

  /** RF-55: registra un pago total o parcial, opcionalmente contra una división. */
  async registerPayment(
    actor: AuthenticatedUser,
    accountId: string,
    dto: CreatePaymentDto,
  ): Promise<AccountDetail> {
    const restaurantId = requireRestaurantId(actor);

    return this.prisma.$transaction(async (tx) => {
      const account = await this.loadAccount(tx, restaurantId, accountId);
      this.assertOpen(account);

      const { calculation } = await this.compute(tx, account);
      const balance = calculation.total - account.paidTotal;
      if (balance <= 0) {
        throw new BadRequestException('La cuenta ya está pagada');
      }
      if (dto.monto > balance) {
        throw new BadRequestException(
          `El pago supera el saldo pendiente de la cuenta (${balance})`,
        );
      }

      if (dto.divisionId) {
        const split = account.splits.find((item) => item.id === dto.divisionId);
        if (!split) {
          throw new NotFoundException('División de cuenta no encontrada');
        }
        const paidForSplit = account.payments
          .filter((payment) => payment.splitId === split.id)
          .reduce((sum, payment) => sum + payment.amount, 0);
        if (dto.monto > split.amount - paidForSplit) {
          throw new BadRequestException('El pago supera el saldo de la división');
        }
      }

      await tx.payment.create({
        data: {
          restaurantId,
          accountId: account.id,
          ...(dto.divisionId ? { splitId: dto.divisionId } : {}),
          method: dto.metodo,
          amount: dto.monto,
          ...(dto.referencia !== undefined ? { reference: dto.referencia.trim() } : {}),
          receivedById: actor.id,
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: { paidTotal: { increment: dto.monto } },
      });

      await tx.restaurantTable.updateMany({
        where: { id: account.tableId, status: TableStatus.OCCUPIED },
        data: { status: TableStatus.TO_CHARGE },
      });

      return this.refreshDetail(tx, restaurantId, account.id);
    });
  }

  /** RF-54: divide la cuenta por comensales o por ítems. */
  async createSplits(
    actor: AuthenticatedUser,
    accountId: string,
    dto: CreateSplitsDto,
  ): Promise<AccountDetail> {
    const restaurantId = requireRestaurantId(actor);

    return this.prisma.$transaction(async (tx) => {
      const account = await this.loadAccount(tx, restaurantId, accountId);
      this.assertOpen(account);

      const { calculation } = await this.compute(tx, account);
      if (calculation.total <= 0) {
        throw new BadRequestException('La cuenta no tiene un total para dividir');
      }

      const splits =
        dto.tipo === 'COMENSAL'
          ? this.buildDinerSplits(dto, calculation)
          : this.buildItemSplits(dto, calculation);

      await tx.split.deleteMany({ where: { accountId: account.id } });
      for (const split of splits) {
        await tx.split.create({
          data: {
            restaurantId,
            accountId: account.id,
            label: split.label,
            amount: split.amount,
            items: {
              create: split.items.map((item) => ({
                restaurantId,
                orderItemId: item.orderItemId,
                quantity: item.quantity,
                amount: item.amount,
              })),
            },
          },
        });
      }

      await tx.restaurantTable.updateMany({
        where: { id: account.tableId, status: TableStatus.OCCUPIED },
        data: { status: TableStatus.TO_CHARGE },
      });

      return this.refreshDetail(tx, restaurantId, account.id);
    });
  }

  /** RF-56: cierra la cuenta solo si está totalmente pagada y libera la mesa. */
  async close(actor: AuthenticatedUser, accountId: string): Promise<AccountDetail> {
    const restaurantId = requireRestaurantId(actor);

    return this.prisma.$transaction(async (tx) => {
      const account = await this.loadAccount(tx, restaurantId, accountId);
      this.assertOpen(account);

      const { calculation } = await this.recalculate(tx, account);
      if (account.paidTotal < calculation.total) {
        throw new BadRequestException(
          `La cuenta no está totalmente pagada. Saldo pendiente: ${calculation.total - account.paidTotal}`,
        );
      }

      const now = new Date();
      await tx.account.update({
        where: { id: account.id },
        data: {
          status: AccountStatus.CLOSED,
          closedById: actor.id,
          closedAt: now,
        },
      });
      await tx.order.update({
        where: { id: account.orderId },
        data: { status: OrderStatus.CLOSED, closedAt: now },
      });
      await tx.restaurantTable.update({
        where: { id: account.tableId },
        data: { status: TableStatus.FREE },
      });

      return this.refreshDetail(tx, restaurantId, account.id);
    });
  }

  /** RF-57: anula una cuenta cerrada con motivo y auditoría básica. */
  async voidAccount(
    actor: AuthenticatedUser,
    accountId: string,
    reason: string,
  ): Promise<AccountDetail> {
    const restaurantId = requireRestaurantId(actor);

    return this.prisma.$transaction(async (tx) => {
      const account = await this.loadAccount(tx, restaurantId, accountId);
      if (account.status !== AccountStatus.CLOSED) {
        throw new BadRequestException('Solo se pueden anular cuentas cerradas');
      }

      const voidedAt = new Date();
      await tx.account.update({
        where: { id: account.id },
        data: {
          status: AccountStatus.VOIDED,
          voidedById: actor.id,
          voidedAt,
          voidReason: reason.trim(),
        },
      });

      await this.audit.record(tx, {
        restaurantId,
        userId: actor.id,
        action: 'VOID_ACCOUNT',
        entityType: 'Account',
        entityId: account.id,
        before: {
          estado: account.status,
          total: account.total,
          pagado: account.paidTotal,
          cerradaEn: account.closedAt,
        },
        after: {
          estado: AccountStatus.VOIDED,
          motivo: reason.trim(),
          anuladaEn: voidedAt,
        },
      });

      return this.refreshDetail(tx, restaurantId, account.id);
    });
  }

  private async loadAccount(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    id: string,
  ): Promise<AccountRecord> {
    const account = await tx.account.findFirst({
      where: { id, restaurantId },
      include: accountInclude,
    });

    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    return account;
  }

  private assertOpen(account: AccountRecord): void {
    if (account.status !== AccountStatus.OPEN) {
      throw new BadRequestException('La cuenta no está abierta');
    }
  }

  private async getRestaurantConfig(
    tx: Prisma.TransactionClient,
    restaurantId: string,
  ): Promise<RestaurantAccountConfig> {
    const restaurant = await tx.restaurant.findUnique({
      where: { id: restaurantId },
      select: restaurantAccountSelect,
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado');
    }

    return restaurant;
  }

  private async compute(
    tx: Prisma.TransactionClient,
    account: AccountRecord,
  ): Promise<{ calculation: AccountCalculation; restaurant: RestaurantAccountConfig }> {
    const [items, taxes, restaurant] = await Promise.all([
      tx.orderItem.findMany({
        where: { restaurantId: account.restaurantId, orderId: account.orderId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          productNameSnapshot: true,
          quantity: true,
          unitPrice: true,
          modifiersTotal: true,
          lineTotal: true,
          status: true,
        },
      }),
      tx.tax.findMany({
        where: { restaurantId: account.restaurantId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, rateBps: true },
      }),
      this.getRestaurantConfig(tx, account.restaurantId),
    ]);

    const calculation = this.calculator.calculate({
      items: items.map((item) => ({
        id: item.id,
        productNameSnapshot: item.productNameSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        modifiersTotal: item.modifiersTotal,
        lineTotal: item.lineTotal,
        status: item.status,
      })),
      discounts: account.discounts.map((discount) => ({
        orderItemId: discount.orderItemId,
        scope: discount.scope,
        type: discount.type,
        value: discount.value,
      })),
      taxes,
      pricesIncludeTax: restaurant.pricesIncludeTax,
      tipBps: account.tipBps,
      tipBase: restaurant.tipBase,
    });

    return { calculation, restaurant };
  }

  private async recalculate(
    tx: Prisma.TransactionClient,
    account: AccountRecord,
  ): Promise<{ calculation: AccountCalculation; restaurant: RestaurantAccountConfig }> {
    const result = await this.compute(tx, account);

    if (result.calculation.total < account.paidTotal) {
      throw new BadRequestException(
        'El total de la cuenta no puede quedar por debajo de lo ya pagado',
      );
    }

    await tx.account.update({
      where: { id: account.id },
      data: {
        subtotal: result.calculation.subtotal,
        discountTotal: result.calculation.discountTotal,
        taxTotal: result.calculation.taxTotal,
        tipTotal: result.calculation.tipTotal,
        total: result.calculation.total,
      },
    });

    return result;
  }

  private async refreshDetail(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    accountId: string,
  ): Promise<AccountDetail> {
    const account = await this.loadAccount(tx, restaurantId, accountId);
    const { calculation, restaurant } = await this.recalculate(tx, account);
    return this.serializeDetail(account, calculation, restaurant);
  }

  private async buildDetail(
    tx: Prisma.TransactionClient,
    account: AccountRecord,
  ): Promise<AccountDetail> {
    const { calculation, restaurant } = await this.compute(tx, account);
    return this.serializeDetail(account, calculation, restaurant);
  }

  private serializeDetail(
    account: AccountRecord,
    calculation: AccountCalculation,
    restaurant: RestaurantAccountConfig,
  ): AccountDetail {
    return {
      id: account.id,
      estado: account.status,
      mesaId: account.tableId,
      mesa: account.table.name,
      zona: account.table.zone.name,
      pedidoId: account.orderId,
      comensales: account.order.guests,
      abiertaEn: account.createdAt,
      cerradaEn: account.closedAt,
      anuladaEn: account.voidedAt,
      motivoAnulacion: account.voidReason,
      abiertaPor: account.openedBy,
      cerradaPor: account.closedBy,
      anuladaPor: account.voidedBy,
      subtotal: calculation.subtotal,
      descuentos: calculation.discountTotal,
      impuestos: calculation.taxTotal,
      propina: calculation.tipTotal,
      total: calculation.total,
      pagado: account.paidTotal,
      saldo: Math.max(0, calculation.total - account.paidTotal),
      propinaBps: account.tipBps,
      propinaSugeridaBps: restaurant.tipSuggestedBps,
      propinaHabilitada: restaurant.tipEnabled,
      preciosIncluyenImpuesto: restaurant.pricesIncludeTax,
      lineas: calculation.lines.map((line) => ({
        itemId: line.itemId,
        nombre: line.productName,
        cantidad: line.quantity,
        precioUnitario: line.unitPrice,
        total: line.lineTotal,
        descuento: line.discount,
        neto: line.netTotal,
      })),
      impuestosDetalle: calculation.taxes.map((tax) => ({
        id: tax.id,
        nombre: tax.name,
        tasaBps: tax.rateBps,
        monto: tax.amount,
      })),
      descuentosDetalle: account.discounts.map((discount) => ({
        id: discount.id,
        itemId: discount.orderItemId,
        itemNombre: discount.orderItem?.productNameSnapshot ?? null,
        alcance: discount.scope,
        tipo: discount.type,
        valor: discount.value,
        motivo: discount.reason,
        aplicadoPor: discount.appliedBy,
        aprobadoPor: discount.approvedBy,
        aprobado: Boolean(discount.approvedById),
        creadoEn: discount.createdAt,
      })),
      pagos: account.payments.map((payment) => ({
        id: payment.id,
        metodo: payment.method,
        monto: payment.amount,
        referencia: payment.reference,
        divisionId: payment.splitId,
        division: payment.split?.label ?? null,
        recibidoPor: payment.receivedBy,
        creadoEn: payment.createdAt,
      })),
      divisiones: account.splits.map((split) => ({
        id: split.id,
        etiqueta: split.label,
        monto: split.amount,
        items: split.items.map((item) => ({
          itemId: item.orderItemId,
          nombre: item.orderItem.productNameSnapshot,
          cantidad: item.quantity,
          monto: item.amount,
        })),
      })),
    };
  }

  private discountBase(calculation: AccountCalculation, dto: CreateDiscountDto): number {
    if (dto.alcance === DiscountScope.ITEM) {
      const line = calculation.lines.find((item) => item.itemId === dto.itemId);
      if (!line) {
        throw new BadRequestException('El ítem no pertenece a la cuenta o está cancelado');
      }
      return line.lineTotal;
    }

    const base = calculation.subtotal - calculation.itemDiscountTotal;
    if (base <= 0) {
      throw new BadRequestException('La cuenta no tiene base para aplicar el descuento');
    }
    return base;
  }

  private effectiveDiscountBps(dto: CreateDiscountDto, base: number): number {
    if (dto.tipo === DiscountType.PERCENT) {
      if (dto.valor > 10_000) {
        throw new BadRequestException('El porcentaje no puede superar 10000 puntos base');
      }
      return dto.valor;
    }

    if (dto.valor > base) {
      throw new BadRequestException(
        'El descuento no puede superar el valor de la línea o de la cuenta',
      );
    }

    return Math.round((dto.valor * 10_000) / base);
  }

  private buildDinerSplits(
    dto: CreateSplitsDto,
    calculation: AccountCalculation,
  ): Array<{
    label: string;
    amount: number;
    items: Array<{ orderItemId: string; quantity: number; amount: number }>;
  }> {
    if (!dto.comensales) {
      throw new BadRequestException('Debes indicar el número de comensales');
    }
    if (dto.grupos?.length) {
      throw new BadRequestException('La división por comensales no admite grupos de ítems');
    }

    const amounts = distributeEqually(calculation.total, dto.comensales);
    return amounts.map((amount, index) => ({
      label: `Comensal ${index + 1}`,
      amount,
      items: [],
    }));
  }

  private buildItemSplits(
    dto: CreateSplitsDto,
    calculation: AccountCalculation,
  ): Array<{
    label: string;
    amount: number;
    items: Array<{ orderItemId: string; quantity: number; amount: number }>;
  }> {
    if (!dto.grupos || dto.grupos.length < 2) {
      throw new BadRequestException('Debes indicar al menos dos grupos de ítems');
    }
    if (dto.comensales !== undefined) {
      throw new BadRequestException('La división por ítems no admite comensales');
    }

    const lines = new Map(calculation.lines.map((line) => [line.itemId, line]));
    const assigned = new Map<string, number>();
    const labels = new Set<string>();

    for (const group of dto.grupos) {
      const label = group.etiqueta.trim();
      if (labels.has(label.toLowerCase())) {
        throw new BadRequestException(`La etiqueta "${label}" está repetida`);
      }
      labels.add(label.toLowerCase());

      const seen = new Set<string>();
      for (const item of group.items) {
        if (seen.has(item.itemId)) {
          throw new BadRequestException(`El ítem está repetido dentro del grupo "${label}"`);
        }
        seen.add(item.itemId);

        const line = lines.get(item.itemId);
        if (!line) {
          throw new BadRequestException(
            'Todos los ítems de la división deben pertenecer a la cuenta y no estar cancelados',
          );
        }

        const quantity = item.cantidad ?? 1;
        const current = assigned.get(item.itemId) ?? 0;
        if (current + quantity > line.quantity) {
          throw new BadRequestException(
            `La cantidad asignada del ítem "${line.productName}" supera la del pedido`,
          );
        }
        assigned.set(item.itemId, current + quantity);
      }
    }

    for (const line of calculation.lines) {
      if ((assigned.get(line.itemId) ?? 0) !== line.quantity) {
        throw new BadRequestException(
          `El ítem "${line.productName}" debe asignarse completo a alguna división`,
        );
      }
    }

    const weights = dto.grupos.map((group) => this.groupWeight(group, lines));
    const amounts = distributeAmounts(calculation.total, weights);

    return dto.grupos.map((group, index) => ({
      label: group.etiqueta.trim(),
      amount: amounts[index] ?? 0,
      items: group.items.map((item) => {
        const line = lines.get(item.itemId);
        const quantity = item.cantidad ?? 1;
        return {
          orderItemId: item.itemId,
          quantity,
          amount: line ? Math.round((line.lineTotal * quantity) / line.quantity) : 0,
        };
      }),
    }));
  }

  private groupWeight(
    group: SplitGroupDto,
    lines: Map<string, AccountCalculation['lines'][number]>,
  ): number {
    return group.items.reduce((sum, item) => {
      const line = lines.get(item.itemId);
      if (!line) {
        return sum;
      }
      const quantity = item.cantidad ?? 1;
      return sum + (line.lineTotal * quantity) / line.quantity;
    }, 0);
  }
}
