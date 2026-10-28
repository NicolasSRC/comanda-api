import { BadRequestException } from '@nestjs/common';
import {
  ALL_DAYS_MASK,
  type ClockParts,
  MenuPricingService,
  type PricingPriceRule,
} from './menu-pricing.service';

const service = new MenuPricingService();

const monday: ClockParts = { dayIndex: 0, minutes: 12 * 60 };
const tuesdayNoon: ClockParts = { dayIndex: 1, minutes: 12 * 60 };

function rule(overrides: Partial<PricingPriceRule>): PricingPriceRule {
  return {
    id: 'rule-1',
    name: 'Regla',
    price: 9000,
    variantId: null,
    daysOfWeek: ALL_DAYS_MASK,
    startTime: '00:00',
    endTime: '00:00',
    priority: 0,
    isActive: true,
    ...overrides,
  };
}

describe('MenuPricingService — horarios', () => {
  it('interpreta una ventana normal dentro del mismo día', () => {
    expect(service.matchesSchedule(ALL_DAYS_MASK, '12:00', '15:00', tuesdayNoon)).toBe(true);
    expect(
      service.matchesSchedule(ALL_DAYS_MASK, '12:00', '15:00', { dayIndex: 1, minutes: 15 * 60 }),
    ).toBe(false);
  });

  it('respeta los días habilitados en la máscara', () => {
    expect(service.matchesSchedule(1 << 0, '12:00', '15:00', tuesdayNoon)).toBe(false);
    expect(service.matchesSchedule(1 << 1, '12:00', '15:00', tuesdayNoon)).toBe(true);
  });

  it('cruza la medianoche y asigna la madrugada al día de inicio', () => {
    const mask = 1 << 1; // martes
    // Martes 23:30 todavía dentro de la ventana.
    expect(
      service.matchesSchedule(mask, '22:00', '02:00', { dayIndex: 1, minutes: 23 * 60 + 30 }),
    ).toBe(true);
    // Miércoles 01:00 pertenece a la ventana que empezó el martes.
    expect(service.matchesSchedule(mask, '22:00', '02:00', { dayIndex: 2, minutes: 60 })).toBe(
      true,
    );
    // Miércoles 03:00 ya está fuera.
    expect(service.matchesSchedule(mask, '22:00', '02:00', { dayIndex: 2, minutes: 3 * 60 })).toBe(
      false,
    );
  });

  it('interpreta start == end como todo el día', () => {
    expect(service.matchesSchedule(1 << 1, '00:00', '00:00', tuesdayNoon)).toBe(true);
  });

  it('convierte el instante UTC a la zona horaria del restaurante', () => {
    const clock = service.getClockParts(new Date('2026-10-27T17:00:00.000Z'), 'America/Bogota');

    expect(clock).toEqual({ dayIndex: 1, minutes: 12 * 60 });
  });
});

describe('MenuPricingService — disponibilidad', () => {
  it('está disponible si no tiene ventanas', () => {
    expect(service.isProductAvailable({}, [], monday)).toBe(true);
  });

  it('no está disponible si está agotado o inactivo', () => {
    expect(service.isProductAvailable({ isAvailable: false }, [], monday)).toBe(false);
    expect(service.isProductAvailable({ isActive: false }, [], monday)).toBe(false);
  });

  it('solo está disponible dentro de alguna ventana activa', () => {
    const windows = [{ daysOfWeek: 1 << 1, startTime: '12:00', endTime: '15:00' }];

    expect(service.isProductAvailable({}, windows, tuesdayNoon)).toBe(true);
    expect(service.isProductAvailable({}, windows, monday)).toBe(false);
    expect(
      service.isProductAvailable(
        {},
        [...windows, { daysOfWeek: 1 << 0, startTime: '00:00', endTime: '00:00', isActive: false }],
        monday,
      ),
    ).toBe(false);
  });
});

describe('MenuPricingService — precio efectivo', () => {
  it('usa el precio base cuando no hay variantes ni reglas', () => {
    const result = service.resolveEffectivePrice({
      basePrice: 18000,
      variants: [],
      rules: [],
      now: tuesdayNoon,
    });

    expect(result).toMatchObject({ unitPrice: 18000, source: 'BASE', ruleId: null });
  });

  it('exige una variante cuando el producto tiene variantes activas', () => {
    expect(() =>
      service.resolveEffectivePrice({
        basePrice: 18000,
        variants: [{ id: 'v1', price: 20000 }],
        rules: [],
        now: tuesdayNoon,
      }),
    ).toThrow(BadRequestException);
  });

  it('usa el precio de la variante seleccionada', () => {
    const result = service.resolveEffectivePrice({
      basePrice: 18000,
      variants: [{ id: 'v1', price: 20000 }],
      selectedVariantId: 'v1',
      rules: [],
      now: tuesdayNoon,
    });

    expect(result).toMatchObject({ unitPrice: 20000, source: 'VARIANT', variantId: 'v1' });
  });

  it('aplica la regla vigente por encima del precio de la variante', () => {
    const result = service.resolveEffectivePrice({
      basePrice: 18000,
      variants: [{ id: 'v1', price: 20000 }],
      selectedVariantId: 'v1',
      rules: [rule({ price: 15000, variantId: 'v1' })],
      now: tuesdayNoon,
    });

    expect(result).toMatchObject({ unitPrice: 15000, source: 'RULE', ruleId: 'rule-1' });
  });

  it('prefiere la regla con mayor prioridad y luego la más específica', () => {
    const result = service.resolveEffectivePrice({
      basePrice: 18000,
      variants: [{ id: 'v1', price: 20000 }],
      selectedVariantId: 'v1',
      rules: [
        rule({ id: 'general', price: 16000, variantId: null, priority: 5 }),
        rule({ id: 'especifica', price: 14000, variantId: 'v1', priority: 1 }),
        rule({ id: 'prioritaria', price: 13000, variantId: null, priority: 10 }),
      ],
      now: tuesdayNoon,
    });

    expect(result.ruleId).toBe('prioritaria');
  });

  it('ignora reglas fuera del horario y usa la variante', () => {
    const result = service.resolveEffectivePrice({
      basePrice: 18000,
      variants: [{ id: 'v1', price: 20000 }],
      selectedVariantId: 'v1',
      rules: [rule({ startTime: '18:00', endTime: '20:00' })],
      now: tuesdayNoon,
    });

    expect(result).toMatchObject({ unitPrice: 20000, source: 'VARIANT' });
  });

  it('rechaza variantes inactivas', () => {
    expect(() =>
      service.resolveEffectivePrice({
        basePrice: 18000,
        variants: [{ id: 'v1', price: 20000, isActive: false }],
        selectedVariantId: 'v1',
        rules: [],
        now: tuesdayNoon,
      }),
    ).toThrow(BadRequestException);
  });
});

describe('MenuPricingService — modificadores', () => {
  const groups = [
    {
      id: 'g1',
      name: 'Adiciones',
      isRequired: false,
      minSelections: 0,
      maxSelections: 2,
      modifiers: [
        { id: 'm1', name: 'Queso', extraPrice: 2000 },
        { id: 'm2', name: 'Guacamole', extraPrice: 3000 },
      ],
    },
    {
      id: 'g2',
      name: 'Punto de cocción',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      modifiers: [{ id: 'm3', name: 'Término medio', extraPrice: 0 }],
    },
  ];

  it('suma los extras y acepta selecciones válidas', () => {
    const result = service.validateModifierSelection(groups, [
      { modifierId: 'm1', quantity: 2 },
      { modifierId: 'm3' },
    ]);

    expect(result.totalExtra).toBe(4000);
    expect(result.selections).toHaveLength(2);
  });

  it('exige los grupos obligatorios', () => {
    expect(() => service.validateModifierSelection(groups, [{ modifierId: 'm1' }])).toThrow(
      /Punto de cocción/,
    );
  });

  it('respeta el máximo de selecciones', () => {
    expect(() =>
      service.validateModifierSelection(groups, [
        { modifierId: 'm1' },
        { modifierId: 'm2' },
        { modifierId: 'm1' },
        { modifierId: 'm3' },
      ]),
    ).toThrow(/máximo 2/);
  });

  it('rechaza modificadores inexistentes o inactivos', () => {
    expect(() => service.validateModifierSelection(groups, [{ modifierId: 'nope' }])).toThrow(
      BadRequestException,
    );

    const inactive = [
      {
        ...groups[0]!,
        modifiers: [{ id: 'm1', name: 'Queso', extraPrice: 2000, isActive: false }],
      },
      groups[1]!,
    ];
    expect(() =>
      service.validateModifierSelection(inactive, [{ modifierId: 'm1' }, { modifierId: 'm3' }]),
    ).toThrow(BadRequestException);
  });

  it('rechaza cantidades no positivas', () => {
    expect(() =>
      service.validateModifierSelection(groups, [
        { modifierId: 'm1', quantity: 0 },
        { modifierId: 'm3' },
      ]),
    ).toThrow(BadRequestException);
  });
});
