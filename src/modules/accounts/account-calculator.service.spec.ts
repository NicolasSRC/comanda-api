import { DiscountScope, DiscountType, OrderItemStatus, TipBase } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  AccountCalculatorService,
  type AccountCalculationInput,
  distributeAmounts,
  distributeEqually,
} from './account-calculator.service';

function item(overrides: Partial<AccountCalculationInput['items'][number]> = {}) {
  return {
    id: 'item-1',
    productNameSnapshot: 'Producto',
    quantity: 1,
    unitPrice: 10_000,
    modifiersTotal: 0,
    lineTotal: 10_000,
    status: OrderItemStatus.SERVED,
    ...overrides,
  };
}

function input(overrides: Partial<AccountCalculationInput> = {}): AccountCalculationInput {
  return {
    items: [item()],
    discounts: [],
    taxes: [],
    pricesIncludeTax: false,
    tipBps: 0,
    tipBase: TipBase.TOTAL,
    ...overrides,
  };
}

describe('AccountCalculatorService', () => {
  const calculator = new AccountCalculatorService();

  it('calcula el subtotal y deja el total igual sin impuestos ni propina', () => {
    const result = calculator.calculate(
      input({
        items: [
          item({ id: 'a', lineTotal: 40_000, quantity: 2, unitPrice: 18_000 }),
          item({ id: 'b', lineTotal: 12_000, unitPrice: 12_000 }),
        ],
      }),
    );

    expect(result.subtotal).toBe(52_000);
    expect(result.discountTotal).toBe(0);
    expect(result.taxTotal).toBe(0);
    expect(result.tipTotal).toBe(0);
    expect(result.total).toBe(52_000);
  });

  it('reproduce el ejemplo de la especificación: 10 % descuento, 19 % IVA y 10 % propina', () => {
    const result = calculator.calculate(
      input({
        items: [item({ lineTotal: 48_000, quantity: 2, unitPrice: 24_000 })],
        discounts: [
          {
            orderItemId: null,
            scope: DiscountScope.ACCOUNT,
            type: DiscountType.PERCENT,
            value: 1_000,
          },
        ],
        taxes: [{ id: 'iva', name: 'IVA', rateBps: 1_900 }],
        tipBps: 1_000,
        tipBase: TipBase.TOTAL,
      }),
    );

    expect(result.subtotal).toBe(48_000);
    expect(result.accountDiscountTotal).toBe(4_800);
    expect(result.discountTotal).toBe(4_800);
    expect(result.taxableBase).toBe(43_200);
    expect(result.taxes).toEqual([{ id: 'iva', name: 'IVA', rateBps: 1_900, amount: 8_208 }]);
    expect(result.taxTotal).toBe(8_208);
    expect(result.tipBaseAmount).toBe(51_408);
    expect(result.tipTotal).toBe(5_141);
    expect(result.total).toBe(56_549);
  });

  it('calcula la propina sobre el subtotal cuando tipBase es SUBTOTAL', () => {
    const result = calculator.calculate(
      input({
        items: [item({ lineTotal: 48_000 })],
        discounts: [
          {
            orderItemId: null,
            scope: DiscountScope.ACCOUNT,
            type: DiscountType.PERCENT,
            value: 1_000,
          },
        ],
        taxes: [{ id: 'iva', name: 'IVA', rateBps: 1_900 }],
        tipBps: 1_000,
        tipBase: TipBase.SUBTOTAL,
      }),
    );

    expect(result.tipBaseAmount).toBe(43_200);
    expect(result.tipTotal).toBe(4_320);
    expect(result.total).toBe(55_728);
  });

  it('extrae el impuesto cuando los precios ya lo incluyen', () => {
    const result = calculator.calculate(
      input({
        items: [item({ lineTotal: 119_000 })],
        taxes: [{ id: 'iva', name: 'IVA', rateBps: 1_900 }],
        pricesIncludeTax: true,
        tipBps: 1_000,
        tipBase: TipBase.TOTAL,
      }),
    );

    expect(result.taxableBase).toBe(119_000);
    expect(result.taxTotal).toBe(19_000);
    expect(result.tipBaseAmount).toBe(119_000);
    expect(result.tipTotal).toBe(11_900);
    expect(result.total).toBe(130_900);
  });

  it('acota un descuento de ítem al total de la línea', () => {
    const result = calculator.calculate(
      input({
        items: [item({ lineTotal: 10_000 })],
        discounts: [
          {
            orderItemId: 'item-1',
            scope: DiscountScope.ITEM,
            type: DiscountType.FIXED,
            value: 15_000,
          },
        ],
      }),
    );

    expect(result.itemDiscountTotal).toBe(10_000);
    expect(result.discountTotal).toBe(10_000);
    expect(result.total).toBe(0);
  });

  it('acota los descuentos de cuenta para no dejar el total negativo', () => {
    const result = calculator.calculate(
      input({
        items: [item({ lineTotal: 10_000 })],
        discounts: [
          {
            orderItemId: 'item-1',
            scope: DiscountScope.ITEM,
            type: DiscountType.FIXED,
            value: 4_000,
          },
          {
            orderItemId: null,
            scope: DiscountScope.ACCOUNT,
            type: DiscountType.FIXED,
            value: 9_000,
          },
        ],
      }),
    );

    expect(result.itemDiscountTotal).toBe(4_000);
    expect(result.accountDiscountTotal).toBe(6_000);
    expect(result.discountTotal).toBe(10_000);
    expect(result.taxableBase).toBe(0);
    expect(result.total).toBe(0);
  });

  it('ignora los ítems cancelados', () => {
    const result = calculator.calculate(
      input({
        items: [
          item({ id: 'ok', lineTotal: 10_000 }),
          item({ id: 'cancelado', lineTotal: 90_000, status: OrderItemStatus.CANCELLED }),
        ],
      }),
    );

    expect(result.subtotal).toBe(10_000);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.itemId).toBe('ok');
  });

  it('suma varios impuestos excluidos y redondea cada uno', () => {
    const result = calculator.calculate(
      input({
        items: [item({ lineTotal: 10_000 })],
        taxes: [
          { id: 'iva', name: 'IVA', rateBps: 1_900 },
          { id: 'consumo', name: 'Consumo', rateBps: 800 },
        ],
      }),
    );

    expect(result.taxes.map((tax) => tax.amount)).toEqual([1_900, 800]);
    expect(result.taxTotal).toBe(2_700);
    expect(result.total).toBe(12_700);
  });

  it('redondea el impuesto al entero más cercano', () => {
    const result = calculator.calculate(
      input({
        items: [item({ lineTotal: 1_005 })],
        taxes: [{ id: 'iva', name: 'IVA', rateBps: 1_000 }],
      }),
    );

    expect(result.taxTotal).toBe(101);
    expect(result.total).toBe(1_106);
  });

  it('reparte un total exacto entre pesos y en partes iguales', () => {
    expect(distributeAmounts(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(distributeAmounts(10, [1, 3])).toEqual([3, 7]);
    expect(distributeEqually(100, 3)).toEqual([34, 33, 33]);
    expect(distributeEqually(0, 2)).toEqual([0, 0]);
  });

  it('prorratea impuestos incluidos entre varias tasas sin perder unidades', () => {
    const result = calculator.calculate(
      input({
        items: [item({ lineTotal: 119_000 })],
        taxes: [
          { id: 'iva', name: 'IVA', rateBps: 1_900 },
          { id: 'consumo', name: 'Consumo', rateBps: 800 },
        ],
        pricesIncludeTax: true,
      }),
    );

    expect(result.taxes.reduce((sum, tax) => sum + tax.amount, 0)).toBe(result.taxTotal);
    expect(result.total).toBe(119_000);
  });
});
