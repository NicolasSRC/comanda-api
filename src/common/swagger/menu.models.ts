import { ApiProperty } from '@nestjs/swagger';
import { MenuVersionStatus } from '@prisma/client';

export class MenuVersionSummaryModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ example: 'Carta 2026' })
  name!: string;

  @ApiProperty({ enum: MenuVersionStatus, enumName: 'MenuVersionStatus' })
  status!: MenuVersionStatus;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  publishedAt!: Date | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  createdById!: string | null;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;
}

export class MenuVersionDetailModel extends MenuVersionSummaryModel {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Copia inmutable de la carta al momento de crear la versión.',
  })
  snapshot!: Record<string, unknown>;
}

export class PublicMenuRestaurantModel {
  @ApiProperty({ example: 'Restaurante Demo' })
  nombre!: string;

  @ApiProperty({ example: 'demo' })
  slug!: string;

  @ApiProperty({ example: 'COP' })
  moneda!: string;

  @ApiProperty({ example: 'America/Bogota' })
  zonaHoraria!: string;
}

export class PublicMenuVersionModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  publicadaEn!: Date | null;

  @ApiProperty({ enum: MenuVersionStatus, enumName: 'MenuVersionStatus', required: false })
  estado?: MenuVersionStatus;
}

export class PublicMenuVariantModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Grande' })
  nombre!: string;

  @ApiProperty({ example: 32000 })
  precio!: number;
}

export class PublicMenuModifierModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Queso extra' })
  nombre!: string;

  @ApiProperty({ example: 2000 })
  precioExtra!: number;
}

export class PublicMenuModifierGroupModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Adiciones' })
  nombre!: string;

  @ApiProperty({ example: false })
  obligatorio!: boolean;

  @ApiProperty({ example: 0 })
  minimo!: number;

  @ApiProperty({ example: 3 })
  maximo!: number;

  @ApiProperty({ type: () => [PublicMenuModifierModel] })
  modificadores!: PublicMenuModifierModel[];
}

export class PublicMenuProductModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ceviche clásico' })
  nombre!: string;

  @ApiProperty({ example: 'Pescado blanco, limón y ají', nullable: true, type: String })
  descripcion!: string | null;

  @ApiProperty({ example: 28000, description: 'Precio vigente según reglas y horario.' })
  precio!: number;

  @ApiProperty({ example: 'https://cdn.demo.com/ceviche.jpg', nullable: true, type: String })
  imagen!: string | null;

  @ApiProperty({ example: true })
  disponible!: boolean;

  @ApiProperty({ example: 'KITCHEN' })
  area!: string;

  @ApiProperty({ type: () => [PublicMenuVariantModel] })
  variantes!: PublicMenuVariantModel[];

  @ApiProperty({ type: () => [PublicMenuModifierGroupModel] })
  gruposModificadores!: PublicMenuModifierGroupModel[];
}

export class PublicMenuCategoryModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Entradas' })
  nombre!: string;

  @ApiProperty({ example: 1 })
  orden!: number;

  @ApiProperty({ type: () => [PublicMenuProductModel] })
  productos!: PublicMenuProductModel[];
}

export class PublicMenuComboItemModel {
  @ApiProperty({ format: 'uuid' })
  productoId!: string;

  @ApiProperty({ example: 'Hamburguesa clásica' })
  producto!: string;

  @ApiProperty({ example: 'Grande', nullable: true, type: String })
  variante!: string | null;

  @ApiProperty({ example: 1 })
  cantidad!: number;
}

export class PublicMenuComboModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Combo familiar' })
  nombre!: string;

  @ApiProperty({ example: 'Hamburguesa + papas + gaseosa', nullable: true, type: String })
  descripcion!: string | null;

  @ApiProperty({ example: 45000 })
  precio!: number;

  @ApiProperty({ example: 'https://cdn.demo.com/combo.jpg', nullable: true, type: String })
  imagen!: string | null;

  @ApiProperty({ type: () => [PublicMenuComboItemModel] })
  items!: PublicMenuComboItemModel[];
}

/** Carta de solo lectura publicada para QR o web. */
export class PublicMenuModel {
  @ApiProperty({ type: () => PublicMenuRestaurantModel })
  restaurante!: PublicMenuRestaurantModel;

  @ApiProperty({ type: () => PublicMenuVersionModel })
  version!: PublicMenuVersionModel;

  @ApiProperty({ type: () => [PublicMenuCategoryModel] })
  categorias!: PublicMenuCategoryModel[];

  @ApiProperty({ type: () => [PublicMenuComboModel] })
  combos!: PublicMenuComboModel[];
}
