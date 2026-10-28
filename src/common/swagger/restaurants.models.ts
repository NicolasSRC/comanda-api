import { ApiProperty } from '@nestjs/swagger';
import { Role, TipBase } from '@prisma/client';

export class RestaurantUserCountModel {
  @ApiProperty({ example: 6 })
  users!: number;
}

/** Restaurante tal como lo devuelve el panel de superadministración. */
export class RestaurantModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Restaurante Demo' })
  name!: string;

  @ApiProperty({ example: 'demo' })
  slug!: string;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty({ example: 'America/Bogota' })
  timezone!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: false })
  pricesIncludeTax!: boolean;

  @ApiProperty({ example: true })
  tipEnabled!: boolean;

  @ApiProperty({ example: 1000, description: 'Propina sugerida en puntos base (1000 = 10 %).' })
  tipSuggestedBps!: number;

  @ApiProperty({ enum: TipBase, enumName: 'TipBase' })
  tipBase!: TipBase;

  @ApiProperty({ example: 2000, description: 'Umbral de aprobación de descuentos en puntos base.' })
  discountApprovalThresholdBps!: number;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => RestaurantUserCountModel, required: false })
  _count?: RestaurantUserCountModel;
}

export class RestaurantAdminModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@demo.com' })
  email!: string;

  @ApiProperty({ example: 'Administrador Demo' })
  fullName!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;
}

/** Restaurante recién creado junto con su primer administrador. */
export class CreatedRestaurantModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Restaurante Demo' })
  name!: string;

  @ApiProperty({ example: 'demo' })
  slug!: string;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty({ example: 'America/Bogota' })
  timezone!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => RestaurantAdminModel })
  admin!: RestaurantAdminModel;
}

/** Configuración de impuestos, propina y descuentos del restaurante. */
export class AccountConfigModel {
  @ApiProperty({ example: false })
  preciosIncluyenImpuesto!: boolean;

  @ApiProperty({ example: true })
  propinaHabilitada!: boolean;

  @ApiProperty({ example: 1000 })
  propinaSugeridaBps!: number;

  @ApiProperty({ enum: TipBase, enumName: 'TipBase' })
  basePropina!: TipBase;

  @ApiProperty({ example: 2000 })
  umbralAprobacionDescuentoBps!: number;
}
