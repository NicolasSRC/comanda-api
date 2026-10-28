import { BadRequestException, Injectable } from '@nestjs/common';

/** Día y minuto del reloj local del restaurante. */
export interface ClockParts {
  /** 0 = lunes … 6 = domingo. */
  dayIndex: number;
  /** Minutos transcurridos desde la medianoche (0–1439). */
  minutes: number;
}

export interface PricingVariant {
  id: string;
  name?: string;
  price: number;
  isActive?: boolean;
}

export interface PricingPriceRule {
  id: string;
  name: string;
  price: number;
  variantId: string | null;
  daysOfWeek: number;
  startTime: string;
  endTime: string;
  priority: number;
  isActive?: boolean;
}

export interface PricingAvailabilityWindow {
  id?: string;
  daysOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface ResolvePriceInput {
  basePrice: number;
  variants: PricingVariant[];
  selectedVariantId?: string | null;
  rules: PricingPriceRule[];
  now: ClockParts;
}

export type PriceSource = 'BASE' | 'VARIANT' | 'RULE';

export interface PriceResolution {
  unitPrice: number;
  source: PriceSource;
  ruleId: string | null;
  variantId: string | null;
}

export interface ModifierLike {
  id: string;
  name: string;
  extraPrice: number;
  isActive?: boolean;
}

export interface ModifierGroupLike {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers: ModifierLike[];
}

export interface ModifierSelection {
  modifierId: string;
  /** Cantidad de veces que se aplica el modificador (por unidad). */
  quantity?: number;
}

export interface ModifierValidationResult {
  totalExtra: number;
  selections: Array<{ modifierId: string; name: string; extraPrice: number; quantity: number }>;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export const ALL_DAYS_MASK = 127;

/**
 * Servicio puro de resolución de precio y disponibilidad (RF-15 a RF-17).
 *
 * No accede a base de datos ni al reloj del sistema: recibe el instante ya
 * convertido a la zona horaria del restaurante, lo que hace las reglas
 * deterministas y fáciles de probar.
 */
@Injectable()
export class MenuPricingService {
  /** Convierte `HH:mm` a minutos desde la medianoche. */
  timeToMinutes(value: string): number {
    const match = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(value);
    if (!match) {
      throw new BadRequestException(`Hora inválida: ${value}`);
    }

    return Number(match[1]) * 60 + Number(match[2]);
  }

  /** Obtiene el día y minuto locales del restaurante para un instante dado. */
  getClockParts(date: Date, timeZone: string): ClockParts {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const weekday = parts.find((part) => part.type === 'weekday')?.value;
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);

    const dayIndex = weekday ? WEEKDAY_INDEX[weekday] : undefined;
    if (dayIndex === undefined || !Number.isInteger(hour) || !Number.isInteger(minute)) {
      throw new Error(`No se pudo interpretar la fecha en la zona horaria ${timeZone}`);
    }

    return { dayIndex, minutes: hour * 60 + minute };
  }

  isDayEnabled(daysOfWeek: number, dayIndex: number): boolean {
    return (daysOfWeek & (1 << dayIndex)) !== 0;
  }

  /**
   * Comprueba si el minuto actual cae dentro de una ventana.
   *
   * - `endTime > startTime`: ventana dentro del mismo día.
   * - `endTime < startTime`: cruza la medianoche; la madrugada pertenece al
   *   día en que comenzó la ventana.
   * - `startTime === endTime`: se interpreta como todo el día.
   */
  matchesSchedule(
    daysOfWeek: number,
    startTime: string,
    endTime: string,
    now: ClockParts,
  ): boolean {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    const todayEnabled = this.isDayEnabled(daysOfWeek, now.dayIndex);

    if (start === end) {
      return todayEnabled;
    }

    if (start < end) {
      return todayEnabled && now.minutes >= start && now.minutes < end;
    }

    const previousDay = (now.dayIndex + 6) % 7;
    return (
      (todayEnabled && now.minutes >= start) ||
      (this.isDayEnabled(daysOfWeek, previousDay) && now.minutes < end)
    );
  }

  /** RF-15/RF-16: disponible si está activo, no agotado y dentro de alguna ventana. */
  isProductAvailable(
    product: { isActive?: boolean; isAvailable?: boolean },
    windows: PricingAvailabilityWindow[],
    now: ClockParts,
  ): boolean {
    if (product.isActive === false || product.isAvailable === false) {
      return false;
    }

    const activeWindows = windows.filter((window) => window.isActive !== false);
    if (activeWindows.length === 0) {
      return true;
    }

    return activeWindows.some((window) =>
      this.matchesSchedule(window.daysOfWeek, window.startTime, window.endTime, now),
    );
  }

  /**
   * Resuelve el precio unitario vigente.
   *
   * Orden: variante seleccionada → regla de precio vigente (mayor prioridad,
   * luego ventana más específica) → precio base. Si el producto tiene
   * variantes activas, la variante es obligatoria.
   */
  resolveEffectivePrice(input: ResolvePriceInput): PriceResolution {
    const activeVariants = input.variants.filter((variant) => variant.isActive !== false);
    const selected = input.selectedVariantId
      ? input.variants.find((variant) => variant.id === input.selectedVariantId)
      : undefined;

    if (input.selectedVariantId) {
      if (!selected || selected.isActive === false) {
        throw new BadRequestException('La variante no existe o está inactiva');
      }
    } else if (activeVariants.length > 0) {
      throw new BadRequestException('El producto requiere seleccionar una variante');
    }

    const applicableRules = input.rules
      .filter((rule) => rule.isActive !== false)
      .filter((rule) =>
        input.selectedVariantId
          ? rule.variantId === input.selectedVariantId || rule.variantId === null
          : rule.variantId === null,
      )
      .filter((rule) =>
        this.matchesSchedule(rule.daysOfWeek, rule.startTime, rule.endTime, input.now),
      )
      .sort((a, b) => {
        // Mayor prioridad primero (orden definido por la regla de negocio);
        // a igual prioridad gana la regla de variante y luego la ventana más
        // específica.
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }

        const specificity = Number(b.variantId !== null) - Number(a.variantId !== null);
        if (specificity !== 0) {
          return specificity;
        }

        const duration =
          this.windowDuration(a.startTime, a.endTime) - this.windowDuration(b.startTime, b.endTime);
        if (duration !== 0) {
          return duration;
        }

        return a.id.localeCompare(b.id);
      });

    const rule = applicableRules[0];
    if (rule) {
      return {
        unitPrice: rule.price,
        source: 'RULE',
        ruleId: rule.id,
        variantId: input.selectedVariantId ?? null,
      };
    }

    if (selected) {
      return {
        unitPrice: selected.price,
        source: 'VARIANT',
        ruleId: null,
        variantId: selected.id,
      };
    }

    return {
      unitPrice: input.basePrice,
      source: 'BASE',
      ruleId: null,
      variantId: null,
    };
  }

  /** Valida mínimos/máximos y calcula el costo extra de los modificadores. */
  validateModifierSelection(
    groups: ModifierGroupLike[],
    selections: ModifierSelection[],
  ): ModifierValidationResult {
    const activeGroups = groups.filter((group) => group.modifiers.length > 0);
    const modifierIndex = new Map<string, { group: ModifierGroupLike; modifier: ModifierLike }>();

    for (const group of activeGroups) {
      for (const modifier of group.modifiers) {
        if (modifier.isActive !== false) {
          modifierIndex.set(modifier.id, { group, modifier });
        }
      }
    }

    const countByGroup = new Map<string, number>();
    const normalized: ModifierValidationResult['selections'] = [];
    let totalExtra = 0;

    for (const selection of selections) {
      const quantity = selection.quantity ?? 1;
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new BadRequestException('La cantidad de un modificador debe ser un entero positivo');
      }

      const found = modifierIndex.get(selection.modifierId);
      if (!found) {
        throw new BadRequestException(
          `El modificador ${selection.modifierId} no existe o no está disponible`,
        );
      }

      countByGroup.set(found.group.id, (countByGroup.get(found.group.id) ?? 0) + quantity);
      totalExtra += found.modifier.extraPrice * quantity;
      normalized.push({
        modifierId: found.modifier.id,
        name: found.modifier.name,
        extraPrice: found.modifier.extraPrice,
        quantity,
      });
    }

    for (const group of activeGroups) {
      const count = countByGroup.get(group.id) ?? 0;
      const minimum = group.isRequired ? Math.max(1, group.minSelections) : group.minSelections;

      if (count < minimum) {
        throw new BadRequestException(
          `El grupo "${group.name}" requiere al menos ${minimum} selección(es)`,
        );
      }
      if (count > group.maxSelections) {
        throw new BadRequestException(
          `El grupo "${group.name}" permite como máximo ${group.maxSelections} selección(es)`,
        );
      }
    }

    return { totalExtra, selections: normalized };
  }

  private windowDuration(startTime: string, endTime: string): number {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    return end >= start ? end - start : 24 * 60 - start + end;
  }
}
