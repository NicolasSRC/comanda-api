import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus, DiscountScope, DiscountType, PaymentMethod } from '@prisma/client';
import { UserRefModel } from './common.models';

export class AccountLineModel {
  @ApiProperty({ format: 'uuid' })
  itemId!: string;

  @ApiProperty({ example: 'Ceviche clásico' })
  nombre!: string;

  @ApiProperty({ example: 2 })
  cantidad!: number;

  @ApiProperty({ example: 28000 })
  precioUnitario!: number;

  @ApiProperty({ example: 60000 })
  total!: number;

  @ApiProperty({ example: 6000 })
  descuento!: number;

  @ApiProperty({ example: 54000 })
  neto!: number;
}

export class AccountTaxLineModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'IVA' })
  nombre!: string;

  @ApiProperty({ example: 1900, description: 'Tasa en puntos base (1900 = 19 %).' })
  tasaBps!: number;

  @ApiProperty({ example: 10260 })
  monto!: number;
}

export class AccountDiscountModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  itemId!: string | null;

  @ApiProperty({ example: 'Ceviche clásico', nullable: true, type: String })
  itemNombre!: string | null;

  @ApiProperty({ enum: DiscountScope, enumName: 'DiscountScope' })
  alcance!: DiscountScope;

  @ApiProperty({ enum: DiscountType, enumName: 'DiscountType' })
  tipo!: DiscountType;

  @ApiProperty({ example: 1000, description: 'Porcentaje en puntos base o monto según el tipo.' })
  valor!: number;

  @ApiProperty({ example: 'Cortesía por demora' })
  motivo!: string;

  @ApiProperty({ type: () => UserRefModel })
  aplicadoPor!: UserRefModel;

  @ApiProperty({ type: () => UserRefModel, nullable: true })
  aprobadoPor!: UserRefModel | null;

  @ApiProperty({ example: true })
  aprobado!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  creadoEn!: Date;
}

export class AccountPaymentModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PaymentMethod, enumName: 'PaymentMethod' })
  metodo!: PaymentMethod;

  @ApiProperty({ example: 50000 })
  monto!: number;

  @ApiProperty({ example: 'APROBADO-123', nullable: true, type: String })
  referencia!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  divisionId!: string | null;

  @ApiProperty({ example: 'Comensal 1', nullable: true, type: String })
  division!: string | null;

  @ApiProperty({ type: () => UserRefModel })
  recibidoPor!: UserRefModel;

  @ApiProperty({ format: 'date-time', type: String })
  creadoEn!: Date;
}

export class AccountSplitItemModel {
  @ApiProperty({ format: 'uuid' })
  itemId!: string;

  @ApiProperty({ example: 'Ceviche clásico' })
  nombre!: string;

  @ApiProperty({ example: 1 })
  cantidad!: number;

  @ApiProperty({ example: 28000 })
  monto!: number;
}

export class AccountSplitModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Comensal 1' })
  etiqueta!: string;

  @ApiProperty({ example: 62000 })
  monto!: number;

  @ApiProperty({ type: () => [AccountSplitItemModel] })
  items!: AccountSplitItemModel[];
}

/** Cuenta con líneas, impuestos, descuentos, pagos y divisiones. */
export class AccountDetailModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AccountStatus, enumName: 'AccountStatus' })
  estado!: AccountStatus;

  @ApiProperty({ format: 'uuid' })
  mesaId!: string;

  @ApiProperty({ example: 'Mesa 4' })
  mesa!: string;

  @ApiProperty({ example: 'Salón principal' })
  zona!: string;

  @ApiProperty({ format: 'uuid' })
  pedidoId!: string;

  @ApiProperty({ example: 4 })
  comensales!: number;

  @ApiProperty({ format: 'date-time', type: String })
  abiertaEn!: Date;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  cerradaEn!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  anuladaEn!: Date | null;

  @ApiProperty({ example: 'Error de cobro', nullable: true, type: String })
  motivoAnulacion!: string | null;

  @ApiProperty({ type: () => UserRefModel })
  abiertaPor!: UserRefModel;

  @ApiProperty({ type: () => UserRefModel, nullable: true })
  cerradaPor!: UserRefModel | null;

  @ApiProperty({ type: () => UserRefModel, nullable: true })
  anuladaPor!: UserRefModel | null;

  @ApiProperty({ example: 120000 })
  subtotal!: number;

  @ApiProperty({ example: 6000 })
  descuentos!: number;

  @ApiProperty({ example: 21660 })
  impuestos!: number;

  @ApiProperty({ example: 12000 })
  propina!: number;

  @ApiProperty({ example: 147660 })
  total!: number;

  @ApiProperty({ example: 100000 })
  pagado!: number;

  @ApiProperty({ example: 47660 })
  saldo!: number;

  @ApiProperty({ example: 1000 })
  propinaBps!: number;

  @ApiProperty({ example: 1000 })
  propinaSugeridaBps!: number;

  @ApiProperty({ example: true })
  propinaHabilitada!: boolean;

  @ApiProperty({ example: false })
  preciosIncluyenImpuesto!: boolean;

  @ApiProperty({ type: () => [AccountLineModel] })
  lineas!: AccountLineModel[];

  @ApiProperty({ type: () => [AccountTaxLineModel] })
  impuestosDetalle!: AccountTaxLineModel[];

  @ApiProperty({ type: () => [AccountDiscountModel] })
  descuentosDetalle!: AccountDiscountModel[];

  @ApiProperty({ type: () => [AccountPaymentModel] })
  pagos!: AccountPaymentModel[];

  @ApiProperty({ type: () => [AccountSplitModel] })
  divisiones!: AccountSplitModel[];
}

export class TaxModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'IVA' })
  nombre!: string;

  @ApiProperty({ example: 1900, description: 'Tasa en puntos base (1900 = 19 %).' })
  tasaBps!: number;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty({ example: 1 })
  orden!: number;

  @ApiProperty({ format: 'date-time', type: String })
  creadoEn!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  actualizadoEn!: Date;
}
