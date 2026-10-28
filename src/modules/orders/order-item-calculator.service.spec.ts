import { BadRequestException } from '@nestjs/common';
import { PreparationArea } from '@prisma/client';
import {
  ALL_DAYS_MASK,
  type ClockParts,
  MenuPricingService,
} from '../catalog/pricing/menu-pricing.service';
import {
  OrderItemCalculatorService,
  type OrderProductPricingSource,
} from './order-item-calculator.service';

const pricing = new MenuPricingService();
const calculator = new OrderItemCalculatorService(pricing);

const noon: ClockParts = { dayIndex: 1, minutes: 12 * 60 };

function product(overrides: Partial<OrderProductPricingSource> = {}): OrderProductPricingSource {
  return {
    id: 'product-1',
    name: 'Nachos',
    basePrice: 10000,
    preparationArea: PreparationArea.KITCHEN,
    isActive: true,
    isAvailable: true,
    variants: [],
    priceRules: [],
    availabilityWindows: [],
    modifierGroups: [],
    ...overrides,
  };
}

describe('OrderItemCalculatorService — precios congelados', () => {
  it('usa el precio base y congela nombre, cantidad y total de línea', () => {
    const item = calculator.calculate(product(), { quantity: 2 }, noon);

    expect(item).toMatchObject({
      productId: 'product-1',
      productNameSnapshot: 'Nachos',
      variantId: null,
      variantNameSnapshot: null,
      quantity: 2,
      unitPrice: 10000,
      modifiersTotal: 0,
      lineTotal: 20000,
      preparationArea: PreparationArea.KITCHEN,
    });
  });

  it('usa el precio de la variante y guarda su nombre', () => {
    const item = calculator.calculate(
      product({
        variants: [{ id: 'variant-1', name: 'Compartir', price: 15000, isActive: true }],
      }),
      { variantId: 'variant-1', quantity: 1 },
      noon,
    );

    expect(item.unitPrice).toBe(15000);
    expect(item.variantNameSnapshot).toBe('Compartir');
    expect(item.lineTotal).toBe(15000);
  });

  it('aplica la regla de precio vigente según el día y la hora', () => {
    const item = calculator.calculate(
      product({
        priceRules: [
          {
            id: 'rule-1',
            name: 'Happy hour',
            price: 7000,
            variantId: null,
            daysOfWeek: ALL_DAYS_MASK,
            startTime: '00:00',
            endTime: '00:00',
            priority: 10,
            isActive: true,
          },
        ],
      }),
      { quantity: 1 },
      noon,
    );

    expect(item.unitPrice).toBe(7000);
  });

  it('suma los extras de modificadores por unidad y por cantidad', () => {
    const item = calculator.calculate(
      product({
        modifierGroups: [
          {
            id: 'group-1',
            name: 'Adiciones',
            isRequired: false,
            minSelections: 0,
            maxSelections: 2,
            modifiers: [{ id: 'modifier-1', name: 'Queso extra', extraPrice: 2000 }],
          },
        ],
      }),
      {
        quantity: 2,
        modifiers: [{ modifierId: 'modifier-1', quantity: 2 }],
      },
      noon,
    );

    expect(item.modifiersTotal).toBe(8000);
    expect(item.lineTotal).toBe(28000);
    expect(item.modifiers).toEqual([
      { modifierId: 'modifier-1', nameSnapshot: 'Queso extra', extraPrice: 2000, quantity: 2 },
    ]);
  });

  it('exige la variante cuando el producto tiene variantes activas', () => {
    expect(() =>
      calculator.calculate(
        product({ variants: [{ id: 'variant-1', name: 'Personal', price: 9000 }] }),
        { quantity: 1 },
        noon,
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza variantes inactivas', () => {
    expect(() =>
      calculator.calculate(
        product({
          variants: [{ id: 'variant-1', name: 'Personal', price: 9000, isActive: false }],
        }),
        { variantId: 'variant-1', quantity: 1 },
        noon,
      ),
    ).toThrow(BadRequestException);
  });
});

describe('OrderItemCalculatorService — disponibilidad y reglas', () => {
  it('rechaza productos agotados o inactivos', () => {
    expect(() =>
      calculator.calculate(product({ isAvailable: false }), { quantity: 1 }, noon),
    ).toThrow(BadRequestException);
    expect(() => calculator.calculate(product({ isActive: false }), { quantity: 1 }, noon)).toThrow(
      BadRequestException,
    );
  });

  it('rechaza productos fuera de su ventana de disponibilidad', () => {
    expect(() =>
      calculator.calculate(
        product({
          availabilityWindows: [
            { daysOfWeek: ALL_DAYS_MASK, startTime: '18:00', endTime: '22:00' },
          ],
        }),
        { quantity: 1 },
        noon,
      ),
    ).toThrow(BadRequestException);
  });

  it('valida el mínimo de un grupo obligatorio', () => {
    expect(() =>
      calculator.calculate(
        product({
          modifierGroups: [
            {
              id: 'group-1',
              name: 'Punto de cocción',
              isRequired: true,
              minSelections: 1,
              maxSelections: 1,
              modifiers: [{ id: 'modifier-1', name: 'Término medio', extraPrice: 0 }],
            },
          ],
        }),
        { quantity: 1 },
        noon,
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza modificadores que no pertenecen al producto', () => {
    expect(() =>
      calculator.calculate(
        product(),
        { quantity: 1, modifiers: [{ modifierId: 'modifier-x', quantity: 1 }] },
        noon,
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza cantidades no positivas', () => {
    expect(() => calculator.calculate(product(), { quantity: 0 }, noon)).toThrow(
      BadRequestException,
    );
  });
});
