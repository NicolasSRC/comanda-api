import { BadRequestException, Injectable } from '@nestjs/common';
import type { PreparationArea } from '@prisma/client';
import {
  type ClockParts,
  MenuPricingService,
  type ModifierGroupLike,
  type ModifierSelection,
  type PricingAvailabilityWindow,
  type PricingPriceRule,
  type PricingVariant,
} from '../catalog/pricing/menu-pricing.service';

/** Datos mínimos del producto necesarios para congelar un ítem de pedido. */
export interface OrderProductPricingSource {
  id: string;
  name: string;
  basePrice: number;
  preparationArea: PreparationArea;
  isActive: boolean;
  isAvailable: boolean;
  variants: PricingVariant[];
  priceRules: PricingPriceRule[];
  availabilityWindows: PricingAvailabilityWindow[];
  modifierGroups: ModifierGroupLike[];
}

export interface OrderItemSelection {
  variantId?: string | null;
  quantity: number;
  modifiers?: ModifierSelection[];
  notes?: string | null;
}

export interface CalculatedOrderItem {
  productId: string;
  variantId: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  quantity: number;
  unitPrice: number;
  /** Extras de modificadores de toda la línea (por unidad × cantidad). */
  modifiersTotal: number;
  lineTotal: number;
  notes: string | null;
  preparationArea: PreparationArea;
  modifiers: Array<{
    modifierId: string;
    nameSnapshot: string;
    extraPrice: number;
    quantity: number;
  }>;
}

/**
 * Servicio puro que convierte una selección del mesero en un ítem con precios
 * congelados (RF-41/RF-42/RF-46). No consulta la base ni el reloj.
 */
@Injectable()
export class OrderItemCalculatorService {
  constructor(private readonly pricing: MenuPricingService) {}

  calculate(
    product: OrderProductPricingSource,
    selection: OrderItemSelection,
    now: ClockParts,
  ): CalculatedOrderItem {
    if (!Number.isInteger(selection.quantity) || selection.quantity < 1) {
      throw new BadRequestException('La cantidad debe ser un entero positivo');
    }

    if (!this.pricing.isProductAvailable(product, product.availabilityWindows, now)) {
      throw new BadRequestException(`El producto "${product.name}" no está disponible`);
    }

    const price = this.pricing.resolveEffectivePrice({
      basePrice: product.basePrice,
      variants: product.variants,
      selectedVariantId: selection.variantId ?? null,
      rules: product.priceRules,
      now,
    });

    const validated = this.pricing.validateModifierSelection(
      product.modifierGroups,
      selection.modifiers ?? [],
    );

    const variant = selection.variantId
      ? product.variants.find((item) => item.id === selection.variantId)
      : undefined;

    const modifiersTotal = validated.totalExtra * selection.quantity;

    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      productNameSnapshot: product.name,
      variantNameSnapshot: variant?.name ?? null,
      quantity: selection.quantity,
      unitPrice: price.unitPrice,
      modifiersTotal,
      lineTotal: price.unitPrice * selection.quantity + modifiersTotal,
      notes: selection.notes?.trim() || null,
      preparationArea: product.preparationArea,
      modifiers: validated.selections.map((item) => ({
        modifierId: item.modifierId,
        nameSnapshot: item.name,
        extraPrice: item.extraPrice,
        quantity: item.quantity,
      })),
    };
  }
}
