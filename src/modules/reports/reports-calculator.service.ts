import { Injectable } from '@nestjs/common';
import { PaymentMethod, PreparationArea } from '@prisma/client';
import { type ReportGrouping, formatPeriod } from '../../common/utils/date-range';

export interface SalesAccountRow {
  closedAt: Date;
  guests: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  tipTotal: number;
  total: number;
}

export interface SalesPeriod {
  periodo: string;
  pedidos: number;
  comensales: number;
  subtotal: number;
  descuentos: number;
  impuestos: number;
  propina: number;
  total: number;
  ticketPromedio: number;
}

export interface SalesTotals {
  pedidos: number;
  comensales: number;
  subtotal: number;
  descuentos: number;
  impuestos: number;
  propina: number;
  total: number;
  ticketPromedio: number;
}

export interface ProductSaleRow {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  lineTotal: number;
}

export interface ProductSales {
  productoId: string;
  producto: string;
  categoriaId: string;
  categoria: string;
  cantidad: number;
  ventas: number;
}

export interface CategorySales {
  categoriaId: string;
  categoria: string;
  cantidad: number;
  ventas: number;
}

export interface WaiterSaleRow {
  waiterId: string;
  waiterName: string;
  guests: number;
  total: number;
}

export interface WaiterSales {
  meseroId: string;
  mesero: string;
  pedidos: number;
  comensales: number;
  total: number;
  ticketPromedio: number;
}

export interface CashPaymentRow {
  method: PaymentMethod;
  amount: number;
  createdAt: Date;
}

export interface CashMethodTotal {
  metodo: PaymentMethod;
  pagos: number;
  total: number;
}

export interface CashDayTotal {
  fecha: string;
  metodos: CashMethodTotal[];
  total: number;
}

export interface PreparationRow {
  area: PreparationArea;
  startedAt: Date | null;
  readyAt: Date | null;
}

export interface PreparationAreaAverage {
  area: PreparationArea;
  items: number;
  promedioSegundos: number;
  promedioMinutos: number;
}

export interface PreparationTotals {
  items: number;
  promedioSegundos: number;
  promedioMinutos: number;
}

const METHOD_ORDER: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.TRANSFER,
];

@Injectable()
export class ReportsCalculatorService {
  /** RF-60: agrupa las cuentas cerradas por día, semana o mes. */
  aggregateSales(
    rows: SalesAccountRow[],
    timeZone: string,
    grouping: ReportGrouping,
  ): { periodos: SalesPeriod[]; totales: SalesTotals } {
    const periods = new Map<string, SalesPeriod>();

    for (const row of rows) {
      const periodo = formatPeriod(row.closedAt, timeZone, grouping);
      const current = periods.get(periodo) ?? emptySalesPeriod(periodo);
      current.pedidos += 1;
      current.comensales += row.guests;
      current.subtotal += row.subtotal;
      current.descuentos += row.discountTotal;
      current.impuestos += row.taxTotal;
      current.propina += row.tipTotal;
      current.total += row.total;
      periods.set(periodo, current);
    }

    const periodos = [...periods.values()]
      .sort((a, b) => a.periodo.localeCompare(b.periodo))
      .map((period) => ({
        ...period,
        ticketPromedio: average(period.total, period.pedidos),
      }));

    const totales = periodos.reduce<SalesTotals>(
      (acc, period) => ({
        pedidos: acc.pedidos + period.pedidos,
        comensales: acc.comensales + period.comensales,
        subtotal: acc.subtotal + period.subtotal,
        descuentos: acc.descuentos + period.descuentos,
        impuestos: acc.impuestos + period.impuestos,
        propina: acc.propina + period.propina,
        total: acc.total + period.total,
        ticketPromedio: 0,
      }),
      emptySalesTotals(),
    );
    totales.ticketPromedio = average(totales.total, totales.pedidos);

    return { periodos, totales };
  }

  /** RF-61/RF-62: productos más/menos vendidos y ventas por categoría. */
  aggregateProducts(
    rows: ProductSaleRow[],
    limit: number,
    order: 'DESC' | 'ASC',
  ): {
    productos: ProductSales[];
    masVendidos: ProductSales[];
    menosVendidos: ProductSales[];
    porCategoria: CategorySales[];
  } {
    const products = new Map<string, ProductSales>();
    const categories = new Map<string, CategorySales>();

    for (const row of rows) {
      const current = products.get(row.productId) ?? {
        productoId: row.productId,
        producto: row.productName,
        categoriaId: row.categoryId,
        categoria: row.categoryName,
        cantidad: 0,
        ventas: 0,
      };
      current.cantidad += row.quantity;
      current.ventas += row.lineTotal;
      products.set(row.productId, current);

      const category = categories.get(row.categoryId) ?? {
        categoriaId: row.categoryId,
        categoria: row.categoryName,
        cantidad: 0,
        ventas: 0,
      };
      category.cantidad += row.quantity;
      category.ventas += row.lineTotal;
      categories.set(row.categoryId, category);
    }

    const byQuantityDesc = [...products.values()].sort(
      (a, b) =>
        b.cantidad - a.cantidad || b.ventas - a.ventas || a.producto.localeCompare(b.producto),
    );
    const byQuantityAsc = [...byQuantityDesc].reverse();
    const productos = order === 'ASC' ? byQuantityAsc : byQuantityDesc;

    return {
      productos: productos.slice(0, limit),
      masVendidos: byQuantityDesc.slice(0, limit),
      menosVendidos: byQuantityAsc.slice(0, limit),
      porCategoria: [...categories.values()].sort(
        (a, b) => b.ventas - a.ventas || a.categoria.localeCompare(b.categoria),
      ),
    };
  }

  /** RF-61: ventas agrupadas por mesero. */
  aggregateWaiters(rows: WaiterSaleRow[]): {
    meseros: WaiterSales[];
    totales: { pedidos: number; comensales: number; total: number; ticketPromedio: number };
  } {
    const waiters = new Map<string, WaiterSales>();

    for (const row of rows) {
      const current = waiters.get(row.waiterId) ?? {
        meseroId: row.waiterId,
        mesero: row.waiterName,
        pedidos: 0,
        comensales: 0,
        total: 0,
        ticketPromedio: 0,
      };
      current.pedidos += 1;
      current.comensales += row.guests;
      current.total += row.total;
      waiters.set(row.waiterId, current);
    }

    const meseros = [...waiters.values()]
      .map((waiter) => ({
        ...waiter,
        ticketPromedio: average(waiter.total, waiter.pedidos),
      }))
      .sort((a, b) => b.total - a.total || a.mesero.localeCompare(b.mesero));

    const totales = meseros.reduce(
      (acc, waiter) => ({
        pedidos: acc.pedidos + waiter.pedidos,
        comensales: acc.comensales + waiter.comensales,
        total: acc.total + waiter.total,
        ticketPromedio: 0,
      }),
      { pedidos: 0, comensales: 0, total: 0, ticketPromedio: 0 },
    );
    totales.ticketPromedio = average(totales.total, totales.pedidos);

    return { meseros, totales };
  }

  /** RF-65: totales de caja por día y método de pago. */
  aggregateCash(
    rows: CashPaymentRow[],
    timeZone: string,
  ): {
    porMetodo: CashMethodTotal[];
    porDia: CashDayTotal[];
    totales: { pagos: number; total: number };
  } {
    const methods = new Map<PaymentMethod, CashMethodTotal>();
    const days = new Map<string, CashDayTotal>();
    const totales = { pagos: 0, total: 0 };

    for (const row of rows) {
      const method = methods.get(row.method) ?? { metodo: row.method, pagos: 0, total: 0 };
      method.pagos += 1;
      method.total += row.amount;
      methods.set(row.method, method);

      const date = formatPeriod(row.createdAt, timeZone, 'DIA');
      const day = days.get(date) ?? { fecha: date, metodos: [], total: 0 };
      const dayMethod = day.metodos.find((item) => item.metodo === row.method);
      if (dayMethod) {
        dayMethod.pagos += 1;
        dayMethod.total += row.amount;
      } else {
        day.metodos.push({ metodo: row.method, pagos: 1, total: row.amount });
      }
      day.total += row.amount;
      days.set(date, day);

      totales.pagos += 1;
      totales.total += row.amount;
    }

    return {
      porMetodo: METHOD_ORDER.filter((method) => methods.has(method)).map((method) =>
        methods.get(method)!,
      ),
      porDia: [...days.values()]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((day) => ({
          ...day,
          metodos: METHOD_ORDER.filter((method) =>
            day.metodos.some((item) => item.metodo === method),
          ).map((method) => day.metodos.find((item) => item.metodo === method)!),
        })),
      totales,
    };
  }

  /** RF-64: tiempo promedio entre inicio y listo, agrupado por área. */
  aggregatePreparation(rows: PreparationRow[]): {
    areas: PreparationAreaAverage[];
    total: PreparationTotals;
  } {
    const areas = new Map<PreparationArea, { items: number; seconds: number }>();
    let totalItems = 0;
    let totalSeconds = 0;

    for (const row of rows) {
      if (!row.startedAt || !row.readyAt) {
        continue;
      }
      const seconds = Math.max(
        0,
        Math.round((row.readyAt.getTime() - row.startedAt.getTime()) / 1000),
      );
      const area = areas.get(row.area) ?? { items: 0, seconds: 0 };
      area.items += 1;
      area.seconds += seconds;
      areas.set(row.area, area);

      totalItems += 1;
      totalSeconds += seconds;
    }

    return {
      areas: [...areas.entries()]
        .map(([area, value]) => ({
          area,
          items: value.items,
          promedioSegundos: average(value.seconds, value.items),
          promedioMinutos: Math.round(average(value.seconds, value.items) / 60),
        }))
        .sort((a, b) => a.area.localeCompare(b.area)),
      total: {
        items: totalItems,
        promedioSegundos: average(totalSeconds, totalItems),
        promedioMinutos: Math.round(average(totalSeconds, totalItems) / 60),
      },
    };
  }

  /** RF-66: CSV de ventas con fila de totales. */
  salesToCsv(periodos: SalesPeriod[], totales: SalesTotals): string {
    const header = [
      'periodo',
      'pedidos',
      'comensales',
      'subtotal',
      'descuentos',
      'impuestos',
      'propina',
      'total',
      'ticketPromedio',
    ];

    const rows = periodos.map((period) => [
      period.periodo,
      period.pedidos,
      period.comensales,
      period.subtotal,
      period.descuentos,
      period.impuestos,
      period.propina,
      period.total,
      period.ticketPromedio,
    ]);

    rows.push([
      'TOTAL',
      totales.pedidos,
      totales.comensales,
      totales.subtotal,
      totales.descuentos,
      totales.impuestos,
      totales.propina,
      totales.total,
      totales.ticketPromedio,
    ]);

    return `\uFEFF${[header, ...rows].map((row) => row.join(',')).join('\r\n')}\r\n`;
  }
}

function emptySalesPeriod(periodo: string): SalesPeriod {
  return {
    periodo,
    pedidos: 0,
    comensales: 0,
    subtotal: 0,
    descuentos: 0,
    impuestos: 0,
    propina: 0,
    total: 0,
    ticketPromedio: 0,
  };
}

function emptySalesTotals(): SalesTotals {
  return {
    pedidos: 0,
    comensales: 0,
    subtotal: 0,
    descuentos: 0,
    impuestos: 0,
    propina: 0,
    total: 0,
    ticketPromedio: 0,
  };
}

function average(total: number, count: number): number {
  return count > 0 ? Math.round(total / count) : 0;
}
