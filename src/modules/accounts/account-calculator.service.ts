import { Injectable } from '@nestjs/common';
import { DiscountScope, DiscountType, OrderItemStatus, TipBase } from '@prisma/client';

/** Ítem mínimo necesario para calcular una cuenta. */
export interface AccountItemInput {
  id: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  modifiersTotal: number;
  lineTotal: number;
  status: OrderItemStatus;
}

export interface AccountDiscountInput {
  orderItemId: string | null;
  scope: DiscountScope;
  type: DiscountType;
  value: number;
}

export interface AccountTaxInput {
  id: string;
  name: string;
  rateBps: number;
}

export interface AccountCalculationInput {
  items: AccountItemInput[];
  discounts: AccountDiscountInput[];
  taxes: AccountTaxInput[];
  pricesIncludeTax: boolean;
  tipBps: number;
  tipBase: TipBase;
}

export interface AccountLineResult {
  itemId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discount: number;
  netTotal: number;
}

export interface AccountTaxResult extends AccountTaxInput {
  amount: number;
}

export interface AccountCalculation {
  subtotal: number;
  itemDiscountTotal: number;
  accountDiscountTotal: number;
  discountTotal: number;
  taxableBase: number;
  taxes: AccountTaxResult[];
  taxTotal: number;
  tipBaseAmount: number;
  tipTotal: number;
  total: number;
  lines: AccountLineResult[];
}

const MAX_BPS = 10_000;

/**
 * Motor puro de cálculo de cuentas (RF-50 a RF-52).
 *
 * Orden: subtotal → descuentos → impuestos → propina. Todo el dinero es entero
 * en la unidad mínima y los porcentajes usan puntos base (10000 = 100 %).
 */
@Injectable()
export class AccountCalculatorService {
  calculate(input: AccountCalculationInput): AccountCalculation {
    const activeItems = input.items.filter((item) => item.status !== OrderItemStatus.CANCELLED);
    const lines = activeItems.map((item) => {
      const lineDiscount = this.itemDiscountFor(item, input.discounts);
      return {
        itemId: item.id,
        productName: item.productNameSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        discount: lineDiscount,
        netTotal: item.lineTotal - lineDiscount,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const itemDiscountTotal = lines.reduce((sum, line) => sum + line.discount, 0);
    const remainingAfterItemDiscounts = Math.max(0, subtotal - itemDiscountTotal);

    const accountDiscountRequested = input.discounts
      .filter((discount) => discount.scope === DiscountScope.ACCOUNT)
      .reduce((sum, discount) => {
        if (discount.type === DiscountType.PERCENT) {
          return sum + applyBps(remainingAfterItemDiscounts, discount.value);
        }
        return sum + Math.max(0, discount.value);
      }, 0);

    const accountDiscountTotal = Math.min(
      remainingAfterItemDiscounts,
      Math.max(0, accountDiscountRequested),
    );
    const discountTotal = Math.min(subtotal, itemDiscountTotal + accountDiscountTotal);
    const taxableBase = Math.max(0, subtotal - discountTotal);

    const taxResult = this.calculateTaxes(taxableBase, input.taxes, input.pricesIncludeTax);

    const effectiveTipBps = clamp(input.tipBps, 0, MAX_BPS);
    const totalBeforeTip = input.pricesIncludeTax ? taxableBase : taxableBase + taxResult.total;
    const tipBaseAmount = input.tipBase === TipBase.SUBTOTAL ? taxableBase : totalBeforeTip;
    const tipTotal = applyBps(tipBaseAmount, effectiveTipBps);
    const total = Math.max(0, totalBeforeTip + tipTotal);

    return {
      subtotal,
      itemDiscountTotal,
      accountDiscountTotal,
      discountTotal,
      taxableBase,
      taxes: taxResult.taxes,
      taxTotal: taxResult.total,
      tipBaseAmount,
      tipTotal,
      total,
      lines,
    };
  }

  private itemDiscountFor(item: AccountItemInput, discounts: AccountDiscountInput[]): number {
    const requested = discounts
      .filter(
        (discount) => discount.scope === DiscountScope.ITEM && discount.orderItemId === item.id,
      )
      .reduce((sum, discount) => {
        if (discount.type === DiscountType.PERCENT) {
          return sum + applyBps(item.lineTotal, discount.value);
        }
        return sum + Math.max(0, discount.value);
      }, 0);

    return Math.min(item.lineTotal, Math.max(0, requested));
  }

  private calculateTaxes(
    taxableBase: number,
    taxes: AccountTaxInput[],
    pricesIncludeTax: boolean,
  ): { taxes: AccountTaxResult[]; total: number } {
    if (taxes.length === 0 || taxableBase === 0) {
      return {
        taxes: taxes.map((tax) => ({ ...tax, amount: 0 })),
        total: 0,
      };
    }

    if (pricesIncludeTax) {
      const combinedRate = taxes.reduce((sum, tax) => sum + Math.max(0, tax.rateBps), 0);
      const total =
        combinedRate === 0
          ? 0
          : Math.round((taxableBase * combinedRate) / (MAX_BPS + combinedRate));
      const amounts = distributeAmounts(
        total,
        taxes.map((tax) => Math.max(0, tax.rateBps)),
      );

      return {
        taxes: taxes.map((tax, index) => ({ ...tax, amount: amounts[index] ?? 0 })),
        total,
      };
    }

    const result = taxes.map((tax) => ({
      ...tax,
      amount: applyBps(taxableBase, Math.max(0, tax.rateBps)),
    }));

    return {
      taxes: result,
      total: result.reduce((sum, tax) => sum + tax.amount, 0),
    };
  }
}

export function applyBps(amount: number, bps: number): number {
  return Math.round((amount * clamp(bps, 0, MAX_BPS)) / MAX_BPS);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Reparte un total entero entre pesos, garantizando que la suma sea exacta.
 * Se usa para divisiones y para prorratear impuestos incluidos.
 */
export function distributeAmounts(total: number, weights: number[]): number[] {
  if (weights.length === 0) {
    return [];
  }

  const safeTotal = Math.max(0, Math.trunc(total));
  const safeWeights = weights.map((weight) => Math.max(0, weight));
  const weightSum = safeWeights.reduce((sum, weight) => sum + weight, 0);

  if (weightSum === 0) {
    return distributeEqually(safeTotal, weights.length);
  }

  const raw = safeWeights.map((weight) => (safeTotal * weight) / weightSum);
  const floors = raw.map((value) => Math.floor(value));
  let remainder = safeTotal - floors.reduce((sum, value) => sum + value, 0);

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const result = [...floors];
  for (let index = 0; index < order.length && remainder > 0; index += 1) {
    const target = order[index];
    if (target) {
      result[target.index] = (result[target.index] ?? 0) + 1;
      remainder -= 1;
    }
  }

  return result;
}

export function distributeEqually(total: number, parts: number): number[] {
  if (parts <= 0) {
    return [];
  }

  const safeTotal = Math.max(0, Math.trunc(total));
  const base = Math.floor(safeTotal / parts);
  const remainder = safeTotal - base * parts;

  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}
