import type { PreparationArea } from '@prisma/client';

export interface SnapshotVariant {
  id: string;
  name: string;
  price: number;
  sortOrder: number;
}

export interface SnapshotPriceRule {
  id: string;
  name: string;
  price: number;
  variantId: string | null;
  daysOfWeek: number;
  startTime: string;
  endTime: string;
  priority: number;
}

export interface SnapshotAvailabilityWindow {
  id: string;
  daysOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface SnapshotModifier {
  id: string;
  name: string;
  extraPrice: number;
  sortOrder: number;
}

export interface SnapshotModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  modifiers: SnapshotModifier[];
}

export interface SnapshotProduct {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  preparationArea: PreparationArea;
  isAvailable: boolean;
  variants: SnapshotVariant[];
  priceRules: SnapshotPriceRule[];
  availabilityWindows: SnapshotAvailabilityWindow[];
  modifierGroups: SnapshotModifierGroup[];
}

export interface SnapshotCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  products: SnapshotProduct[];
}

export interface SnapshotComboItem {
  id: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
}

export interface SnapshotCombo {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  items: SnapshotComboItem[];
}

export interface MenuSnapshot {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    timezone: string;
  };
  categories: SnapshotCategory[];
  combos: SnapshotCombo[];
  generatedAt: string;
}
