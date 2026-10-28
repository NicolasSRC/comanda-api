import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, OrderItemStatus, OrderStatus, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { type ReportGrouping, resolveDateRange } from '../../common/utils/date-range';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CashReportQueryDto,
  PreparationReportQueryDto,
  ProductsReportQueryDto,
  SalesReportQueryDto,
  WaitersReportQueryDto,
} from './dto/report.dto';
import {
  ReportsCalculatorService,
  type SalesPeriod,
  type SalesTotals,
} from './reports-calculator.service';

export interface SalesReport {
  desde: Date;
  hasta: Date;
  agrupacion: ReportGrouping;
  periodos: SalesPeriod[];
  totales: SalesTotals;
}

export interface ProductsReport {
  desde: Date;
  hasta: Date;
  productos: ReturnType<ReportsCalculatorService['aggregateProducts']>['productos'];
  masVendidos: ReturnType<ReportsCalculatorService['aggregateProducts']>['masVendidos'];
  menosVendidos: ReturnType<ReportsCalculatorService['aggregateProducts']>['menosVendidos'];
  porCategoria: ReturnType<ReportsCalculatorService['aggregateProducts']>['porCategoria'];
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: ReportsCalculatorService,
  ) {}

  /** RF-60: ventas por día, semana o mes dentro del rango. */
  async sales(actor: AuthenticatedUser, query: SalesReportQueryDto): Promise<SalesReport> {
    const restaurant = await this.getRestaurant(actor);
    const { from, to } = resolveDateRange({
      desde: query.desde,
      hasta: query.hasta,
      timeZone: restaurant.timezone,
    });

    const accounts = await this.prisma.account.findMany({
      where: {
        restaurantId: restaurant.id,
        status: AccountStatus.CLOSED,
        closedAt: { gte: from, lte: to },
      },
      select: {
        closedAt: true,
        subtotal: true,
        discountTotal: true,
        taxTotal: true,
        tipTotal: true,
        total: true,
        order: { select: { guests: true } },
      },
      orderBy: { closedAt: 'asc' },
    });

    const { periodos, totales } = this.calculator.aggregateSales(
      accounts.map((account) => ({
        closedAt: account.closedAt!,
        guests: account.order.guests,
        subtotal: account.subtotal,
        discountTotal: account.discountTotal,
        taxTotal: account.taxTotal,
        tipTotal: account.tipTotal,
        total: account.total,
      })),
      restaurant.timezone,
      query.agrupacion,
    );

    return {
      desde: from,
      hasta: to,
      agrupacion: query.agrupacion,
      periodos,
      totales,
    };
  }

  /** RF-66: exportación CSV del reporte de ventas. */
  async salesCsv(actor: AuthenticatedUser, query: SalesReportQueryDto): Promise<string> {
    const report = await this.sales(actor, query);
    return this.calculator.salesToCsv(report.periodos, report.totales);
  }

  /** RF-61/RF-62: productos más/menos vendidos y desglose por categoría. */
  async products(actor: AuthenticatedUser, query: ProductsReportQueryDto): Promise<ProductsReport> {
    const restaurant = await this.getRestaurant(actor);
    const { from, to } = resolveDateRange({
      desde: query.desde,
      hasta: query.hasta,
      timeZone: restaurant.timezone,
    });

    const where: Prisma.OrderItemWhereInput = {
      restaurantId: restaurant.id,
      status: { not: OrderItemStatus.CANCELLED },
      order: {
        is: {
          status: OrderStatus.CLOSED,
          closedAt: { gte: from, lte: to },
          account: { is: { status: AccountStatus.CLOSED } },
        },
      },
      ...(query.categoriaId ? { product: { categoryId: query.categoriaId } } : {}),
    };

    const items = await this.prisma.orderItem.findMany({
      where,
      select: {
        productId: true,
        productNameSnapshot: true,
        quantity: true,
        lineTotal: true,
        product: {
          select: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const result = this.calculator.aggregateProducts(
      items.map((item) => ({
        productId: item.productId,
        productName: item.productNameSnapshot,
        categoryId: item.product.category.id,
        categoryName: item.product.category.name,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      query.limite,
      query.orden,
    );

    return { desde: from, hasta: to, ...result };
  }

  /** RF-61: ventas agrupadas por mesero. */
  async waiters(actor: AuthenticatedUser, query: WaitersReportQueryDto) {
    const restaurant = await this.getRestaurant(actor);
    const { from, to } = resolveDateRange({
      desde: query.desde,
      hasta: query.hasta,
      timeZone: restaurant.timezone,
    });

    const accounts = await this.prisma.account.findMany({
      where: {
        restaurantId: restaurant.id,
        status: AccountStatus.CLOSED,
        closedAt: { gte: from, lte: to },
      },
      select: {
        total: true,
        order: {
          select: {
            guests: true,
            waiter: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    return {
      desde: from,
      hasta: to,
      ...this.calculator.aggregateWaiters(
        accounts.map((account) => ({
          waiterId: account.order.waiter.id,
          waiterName: account.order.waiter.fullName,
          guests: account.order.guests,
          total: account.total,
        })),
      ),
    };
  }

  /** RF-65: cierre de caja por método de pago y día. */
  async cash(actor: AuthenticatedUser, query: CashReportQueryDto) {
    const restaurant = await this.getRestaurant(actor);
    const { from, to } = resolveDateRange({
      desde: query.desde,
      hasta: query.hasta,
      timeZone: restaurant.timezone,
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        restaurantId: restaurant.id,
        createdAt: { gte: from, lte: to },
        ...(query.metodoPago ? { method: query.metodoPago } : {}),
        account: { is: { status: AccountStatus.CLOSED } },
      },
      select: { method: true, amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      desde: from,
      hasta: to,
      ...this.calculator.aggregateCash(payments, restaurant.timezone),
    };
  }

  /** RF-64: tiempo promedio de preparación por área. */
  async preparation(actor: AuthenticatedUser, query: PreparationReportQueryDto) {
    const restaurant = await this.getRestaurant(actor);
    const { from, to } = resolveDateRange({
      desde: query.desde,
      hasta: query.hasta,
      timeZone: restaurant.timezone,
    });

    const items = await this.prisma.orderItem.findMany({
      where: {
        restaurantId: restaurant.id,
        readyAt: { gte: from, lte: to },
        startedAt: { not: null },
        status: { not: OrderItemStatus.CANCELLED },
        ...(query.area ? { preparationArea: query.area } : {}),
      },
      select: { preparationArea: true, startedAt: true, readyAt: true },
    });

    return {
      desde: from,
      hasta: to,
      ...this.calculator.aggregatePreparation(
        items.map((item) => ({
          area: item.preparationArea,
          startedAt: item.startedAt,
          readyAt: item.readyAt,
        })),
      ),
    };
  }

  private async getRestaurant(actor: AuthenticatedUser): Promise<{
    id: string;
    timezone: string;
  }> {
    const restaurantId = requireRestaurantId(actor);
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, timezone: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado');
    }

    return restaurant;
  }
}
