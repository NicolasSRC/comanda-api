import { PaymentMethod, PreparationArea } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  ReportsCalculatorService,
  type CashPaymentRow,
  type ProductSaleRow,
  type SalesAccountRow,
  type WaiterSaleRow,
} from './reports-calculator.service';

const TIME_ZONE = 'America/Bogota';

function sale(overrides: Partial<SalesAccountRow> = {}): SalesAccountRow {
  return {
    closedAt: new Date('2026-10-28T15:00:00.000Z'),
    guests: 2,
    subtotal: 10_000,
    discountTotal: 0,
    taxTotal: 1_900,
    tipTotal: 1_000,
    total: 12_900,
    ...overrides,
  };
}

function productSale(overrides: Partial<ProductSaleRow> = {}): ProductSaleRow {
  return {
    productId: 'product-1',
    productName: 'Nachos',
    categoryId: 'category-1',
    categoryName: 'Comida',
    quantity: 1,
    lineTotal: 10_000,
    ...overrides,
  };
}

function waiterSale(overrides: Partial<WaiterSaleRow> = {}): WaiterSaleRow {
  return {
    waiterId: 'waiter-1',
    waiterName: 'Ana',
    guests: 2,
    total: 12_900,
    ...overrides,
  };
}

function payment(overrides: Partial<CashPaymentRow> = {}): CashPaymentRow {
  return {
    method: PaymentMethod.CASH,
    amount: 10_000,
    createdAt: new Date('2026-10-28T15:00:00.000Z'),
    ...overrides,
  };
}

describe('ReportsCalculatorService', () => {
  const calculator = new ReportsCalculatorService();

  describe('aggregateSales', () => {
    it('agrupa por día y calcula totales y ticket promedio', () => {
      const result = calculator.aggregateSales(
        [
          sale({
            total: 12_900,
            subtotal: 10_000,
            discountTotal: 500,
            taxTotal: 1_900,
            tipTotal: 1_000,
          }),
          sale({
            total: 25_800,
            subtotal: 20_000,
            discountTotal: 1_000,
            taxTotal: 3_800,
            tipTotal: 2_000,
          }),
          sale({
            closedAt: new Date('2026-10-29T15:00:00.000Z'),
            guests: 3,
            total: 6_000,
            subtotal: 5_000,
            discountTotal: 0,
            taxTotal: 0,
            tipTotal: 1_000,
          }),
        ],
        TIME_ZONE,
        'DIA',
      );

      expect(result.periodos).toEqual([
        {
          periodo: '2026-10-28',
          pedidos: 2,
          comensales: 4,
          subtotal: 30_000,
          descuentos: 1_500,
          impuestos: 5_700,
          propina: 3_000,
          total: 38_700,
          ticketPromedio: 19_350,
        },
        {
          periodo: '2026-10-29',
          pedidos: 1,
          comensales: 3,
          subtotal: 5_000,
          descuentos: 0,
          impuestos: 0,
          propina: 1_000,
          total: 6_000,
          ticketPromedio: 6_000,
        },
      ]);

      expect(result.totales).toEqual({
        pedidos: 3,
        comensales: 7,
        subtotal: 35_000,
        descuentos: 1_500,
        impuestos: 5_700,
        propina: 4_000,
        total: 44_700,
        ticketPromedio: 14_900,
      });
    });

    it('agrupa por semana y por mes', () => {
      const rows = [
        sale({ closedAt: new Date('2026-10-26T15:00:00.000Z') }),
        sale({ closedAt: new Date('2026-10-28T15:00:00.000Z') }),
        sale({ closedAt: new Date('2026-11-02T15:00:00.000Z') }),
      ];

      expect(
        calculator.aggregateSales(rows, TIME_ZONE, 'SEMANA').periodos.map((p) => ({
          periodo: p.periodo,
          pedidos: p.pedidos,
        })),
      ).toEqual([
        { periodo: '2026-10-26', pedidos: 2 },
        { periodo: '2026-11-02', pedidos: 1 },
      ]);

      expect(
        calculator.aggregateSales(rows, TIME_ZONE, 'MES').periodos.map((p) => ({
          periodo: p.periodo,
          pedidos: p.pedidos,
        })),
      ).toEqual([
        { periodo: '2026-10', pedidos: 2 },
        { periodo: '2026-11', pedidos: 1 },
      ]);
    });

    it('devuelve totales en cero sin cuentas', () => {
      expect(calculator.aggregateSales([], TIME_ZONE, 'DIA')).toEqual({
        periodos: [],
        totales: {
          pedidos: 0,
          comensales: 0,
          subtotal: 0,
          descuentos: 0,
          impuestos: 0,
          propina: 0,
          total: 0,
          ticketPromedio: 0,
        },
      });
    });
  });

  describe('aggregateProducts', () => {
    const rows = [
      productSale({ productId: 'nachos', productName: 'Nachos', quantity: 3, lineTotal: 72_000 }),
      productSale({
        productId: 'beer',
        productName: 'Cerveza',
        categoryId: 'category-2',
        categoryName: 'Bebidas',
        quantity: 5,
        lineTotal: 60_000,
      }),
      productSale({
        productId: 'soup',
        productName: 'Sopa',
        quantity: 1,
        lineTotal: 12_000,
      }),
    ];

    it('ordena por cantidad y calcula más y menos vendidos', () => {
      const result = calculator.aggregateProducts(rows, 2, 'DESC');

      expect(result.productos.map((p) => p.producto)).toEqual(['Cerveza', 'Nachos']);
      expect(result.masVendidos.map((p) => p.producto)).toEqual(['Cerveza', 'Nachos']);
      expect(result.menosVendidos.map((p) => p.producto)).toEqual(['Sopa', 'Nachos']);
      expect(result.productos[0]).toEqual({
        productoId: 'beer',
        producto: 'Cerveza',
        categoriaId: 'category-2',
        categoria: 'Bebidas',
        cantidad: 5,
        ventas: 60_000,
      });
    });

    it('permite ordenar de forma ascendente', () => {
      const result = calculator.aggregateProducts(rows, 10, 'ASC');

      expect(result.productos.map((p) => p.producto)).toEqual(['Sopa', 'Nachos', 'Cerveza']);
    });

    it('agrega las ventas por categoría', () => {
      const result = calculator.aggregateProducts(rows, 10, 'DESC');

      expect(result.porCategoria).toEqual([
        { categoriaId: 'category-1', categoria: 'Comida', cantidad: 4, ventas: 84_000 },
        { categoriaId: 'category-2', categoria: 'Bebidas', cantidad: 5, ventas: 60_000 },
      ]);
    });
  });

  describe('aggregateWaiters', () => {
    it('agrupa por mesero y calcula ticket promedio', () => {
      const result = calculator.aggregateWaiters([
        waiterSale({ total: 12_900, guests: 2 }),
        waiterSale({ total: 6_000, guests: 1 }),
        waiterSale({ waiterId: 'waiter-2', waiterName: 'Luis', total: 20_000, guests: 4 }),
      ]);

      expect(result.meseros).toEqual([
        {
          meseroId: 'waiter-2',
          mesero: 'Luis',
          pedidos: 1,
          comensales: 4,
          total: 20_000,
          ticketPromedio: 20_000,
        },
        {
          meseroId: 'waiter-1',
          mesero: 'Ana',
          pedidos: 2,
          comensales: 3,
          total: 18_900,
          ticketPromedio: 9_450,
        },
      ]);

      expect(result.totales).toEqual({
        pedidos: 3,
        comensales: 7,
        total: 38_900,
        ticketPromedio: 12_967,
      });
    });
  });

  describe('aggregateCash', () => {
    it('agrupa por método y por día excluyendo métodos sin pagos', () => {
      const result = calculator.aggregateCash(
        [
          payment({ method: PaymentMethod.CASH, amount: 20_000 }),
          payment({ method: PaymentMethod.CARD, amount: 23_200 }),
          payment({
            method: PaymentMethod.CASH,
            amount: 10_000,
            createdAt: new Date('2026-10-29T15:00:00.000Z'),
          }),
        ],
        TIME_ZONE,
      );

      expect(result.porMetodo).toEqual([
        { metodo: PaymentMethod.CASH, pagos: 2, total: 30_000 },
        { metodo: PaymentMethod.CARD, pagos: 1, total: 23_200 },
      ]);

      expect(result.porDia).toEqual([
        {
          fecha: '2026-10-28',
          metodos: [
            { metodo: PaymentMethod.CASH, pagos: 1, total: 20_000 },
            { metodo: PaymentMethod.CARD, pagos: 1, total: 23_200 },
          ],
          total: 43_200,
        },
        {
          fecha: '2026-10-29',
          metodos: [{ metodo: PaymentMethod.CASH, pagos: 1, total: 10_000 }],
          total: 10_000,
        },
      ]);

      expect(result.totales).toEqual({ pagos: 3, total: 53_200 });
    });
  });

  describe('aggregatePreparation', () => {
    it('calcula promedios por área ignorando ítems sin tiempos completos', () => {
      const base = new Date('2026-10-28T15:00:00.000Z');
      const result = calculator.aggregatePreparation([
        {
          area: PreparationArea.KITCHEN,
          startedAt: new Date(base.getTime() - 300_000),
          readyAt: base,
        },
        {
          area: PreparationArea.KITCHEN,
          startedAt: new Date(base.getTime() - 420_000),
          readyAt: base,
        },
        {
          area: PreparationArea.BAR,
          startedAt: new Date(base.getTime() - 120_000),
          readyAt: base,
        },
        {
          area: PreparationArea.BAR,
          startedAt: null,
          readyAt: base,
        },
      ]);

      expect(result.areas).toEqual([
        {
          area: PreparationArea.BAR,
          items: 1,
          promedioSegundos: 120,
          promedioMinutos: 2,
        },
        {
          area: PreparationArea.KITCHEN,
          items: 2,
          promedioSegundos: 360,
          promedioMinutos: 6,
        },
      ]);

      expect(result.total).toEqual({
        items: 3,
        promedioSegundos: 280,
        promedioMinutos: 5,
      });
    });
  });

  describe('salesToCsv', () => {
    it('incluye BOM, encabezado y fila de totales', () => {
      const { periodos, totales } = calculator.aggregateSales(
        [sale({ total: 12_900 })],
        TIME_ZONE,
        'DIA',
      );

      const csv = calculator.salesToCsv(periodos, totales);
      const lines = csv
        .replace(/^\uFEFF/, '')
        .trimEnd()
        .split('\r\n');

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(lines[0]).toBe(
        'periodo,pedidos,comensales,subtotal,descuentos,impuestos,propina,total,ticketPromedio',
      );
      expect(lines[1]).toBe('2026-10-28,1,2,10000,0,1900,1000,12900,12900');
      expect(lines[2]).toBe('TOTAL,1,2,10000,0,1900,1000,12900,12900');
    });
  });
});
