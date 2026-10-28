import { ApiProperty } from '@nestjs/swagger';
import { PreparationArea } from '@prisma/client';

export class CategoryProductCountModel {
  @ApiProperty({ example: 12 })
  products!: number;
}

export class CategoryModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ example: 'Entradas' })
  name!: string;

  @ApiProperty({ example: 'Para compartir', nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ example: 1 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => CategoryProductCountModel })
  _count!: CategoryProductCountModel;
}

export class CategoryRefModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Entradas' })
  name!: string;
}

export class ProductVariantCountModel {
  @ApiProperty({ example: 2 })
  variants!: number;
}

export class ProductListItemModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ example: 'Ceviche clásico' })
  name!: string;

  @ApiProperty({ example: 'Pescado blanco, limón y ají', nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ example: 28000, description: 'Precio en la menor unidad monetaria.' })
  basePrice!: number;

  @ApiProperty({ example: 'https://cdn.demo.com/ceviche.jpg', nullable: true, type: String })
  imageUrl!: string | null;

  @ApiProperty({ enum: PreparationArea, enumName: 'PreparationArea' })
  preparationArea!: PreparationArea;

  @ApiProperty({ example: true })
  isAvailable!: boolean;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => CategoryRefModel })
  category!: CategoryRefModel;

  @ApiProperty({ type: () => ProductVariantCountModel })
  _count!: ProductVariantCountModel;
}

export class VariantModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 'Grande' })
  name!: string;

  @ApiProperty({ example: 32000 })
  price!: number;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;
}

export class PriceRuleModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  variantId!: string | null;

  @ApiProperty({ example: 'Almuerzo ejecutivo' })
  name!: string;

  @ApiProperty({ example: 24000 })
  price!: number;

  @ApiProperty({ example: 31, description: 'Máscara de días de la semana (bit 0 = lunes).' })
  daysOfWeek!: number;

  @ApiProperty({ example: '12:00' })
  startTime!: string;

  @ApiProperty({ example: '15:00' })
  endTime!: string;

  @ApiProperty({ example: 10, description: 'Mayor prioridad gana ante reglas solapadas.' })
  priority!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;
}

export class AvailabilityWindowModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 127 })
  daysOfWeek!: number;

  @ApiProperty({ example: '08:00' })
  startTime!: string;

  @ApiProperty({ example: '23:00' })
  endTime!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;
}

export class ModifierModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ example: 'Sin cebolla' })
  name!: string;

  @ApiProperty({ example: 0 })
  extraPrice!: number;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;
}

export class ModifierGroupProductCountModel {
  @ApiProperty({ example: 4 })
  products!: number;
}

export class ModifierGroupModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ example: 'Término de la carne' })
  name!: string;

  @ApiProperty({ example: true })
  isRequired!: boolean;

  @ApiProperty({ example: 1 })
  minSelections!: number;

  @ApiProperty({ example: 1 })
  maxSelections!: number;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => [ModifierModel] })
  modifiers!: ModifierModel[];

  @ApiProperty({ type: () => ModifierGroupProductCountModel, required: false })
  _count?: ModifierGroupProductCountModel;
}

export class ProductModifierGroupModel {
  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ type: () => ModifierGroupModel })
  group!: ModifierGroupModel;
}

/** Producto con todas sus relaciones de carta. */
export class ProductDetailModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ example: 'Ceviche clásico' })
  name!: string;

  @ApiProperty({ example: 'Pescado blanco, limón y ají', nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ example: 28000 })
  basePrice!: number;

  @ApiProperty({ example: 'https://cdn.demo.com/ceviche.jpg', nullable: true, type: String })
  imageUrl!: string | null;

  @ApiProperty({ enum: PreparationArea, enumName: 'PreparationArea' })
  preparationArea!: PreparationArea;

  @ApiProperty({ example: true })
  isAvailable!: boolean;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => CategoryRefModel })
  category!: CategoryRefModel;

  @ApiProperty({ type: () => [VariantModel] })
  variants!: VariantModel[];

  @ApiProperty({ type: () => [PriceRuleModel] })
  priceRules!: PriceRuleModel[];

  @ApiProperty({ type: () => [AvailabilityWindowModel] })
  availabilityWindows!: AvailabilityWindowModel[];

  @ApiProperty({ type: () => [ProductModifierGroupModel] })
  modifierGroups!: ProductModifierGroupModel[];
}

export class ComboItemProductModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Hamburguesa clásica' })
  name!: string;
}

export class ComboItemModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  comboId!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  variantId!: string | null;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ type: () => ComboItemProductModel })
  product!: ComboItemProductModel;

  @ApiProperty({ type: () => ComboItemProductModel, nullable: true })
  variant!: ComboItemProductModel | null;
}

export class ComboModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ example: 'Combo familiar' })
  name!: string;

  @ApiProperty({ example: 'Hamburguesa + papas + gaseosa', nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ example: 45000 })
  price!: number;

  @ApiProperty({ example: 'https://cdn.demo.com/combo.jpg', nullable: true, type: String })
  imageUrl!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => [ComboItemModel] })
  items!: ComboItemModel[];
}
