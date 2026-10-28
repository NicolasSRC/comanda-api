import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PreparationArea } from '@prisma/client';

export class SalesPeriodModel {
  @ApiProperty({ example: '2026-10-01' })
  periodo!: string;

  @ApiProperty({ example: 12 })
  pedidos!: number;

  @ApiProperty({ example: 34 })
  comensales!: number;

  @ApiProperty({ example: 480000 })
  subtotal!: number;

  @ApiProperty({ example: 12000 })
  descuentos!: number;

  @ApiProperty({ example: 88920 })
  impuestos!: number;

  @ApiProperty({ example: 48000 })
  propina!: number;

  @ApiProperty({ example: 604920 })
  total!: number;

  @ApiProperty({ example: 50410 })
  ticketPromedio!: number;
}

export class SalesTotalsModel extends SalesPeriodModel {}

export class SalesReportModel {
  @ApiProperty({ format: 'date-time', type: String })
  desde!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  hasta!: Date;

  @ApiProperty({ enum: ['DIA', 'SEMANA', 'MES'], enumName: 'ReportGrouping' })
  agrupacion!: 'DIA' | 'SEMANA' | 'MES';

  @ApiProperty({ type: () => [SalesPeriodModel] })
  periodos!: SalesPeriodModel[];

  @ApiProperty({ type: () => SalesTotalsModel })
  totales!: SalesTotalsModel;
}

export class ProductSalesModel {
  @ApiProperty({ format: 'uuid' })
  productoId!: string;

  @ApiProperty({ example: 'Ceviche clásico' })
  producto!: string;

  @ApiProperty({ format: 'uuid' })
  categoriaId!: string;

  @ApiProperty({ example: 'Entradas' })
  categoria!: string;

  @ApiProperty({ example: 24 })
  cantidad!: number;

  @ApiProperty({ example: 672000 })
  ventas!: number;
}

export class CategorySalesModel {
  @ApiProperty({ format: 'uuid' })
  categoriaId!: string;

  @ApiProperty({ example: 'Entradas' })
  categoria!: string;

  @ApiProperty({ example: 42 })
  cantidad!: number;

  @ApiProperty({ example: 980000 })
  ventas!: number;
}

export class ProductsReportModel {
  @ApiProperty({ format: 'date-time', type: String })
  desde!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  hasta!: Date;

  @ApiProperty({ type: () => [ProductSalesModel] })
  productos!: ProductSalesModel[];

  @ApiProperty({ type: () => [ProductSalesModel] })
  masVendidos!: ProductSalesModel[];

  @ApiProperty({ type: () => [ProductSalesModel] })
  menosVendidos!: ProductSalesModel[];

  @ApiProperty({ type: () => [CategorySalesModel] })
  porCategoria!: CategorySalesModel[];
}

export class WaiterSalesModel {
  @ApiProperty({ format: 'uuid' })
  meseroId!: string;

  @ApiProperty({ example: 'Mesero Demo' })
  mesero!: string;

  @ApiProperty({ example: 18 })
  pedidos!: number;

  @ApiProperty({ example: 52 })
  comensales!: number;

  @ApiProperty({ example: 890000 })
  total!: number;

  @ApiProperty({ example: 49444 })
  ticketPromedio!: number;
}

export class WaiterTotalsModel {
  @ApiProperty({ example: 18 })
  pedidos!: number;

  @ApiProperty({ example: 52 })
  comensales!: number;

  @ApiProperty({ example: 890000 })
  total!: number;

  @ApiProperty({ example: 49444 })
  ticketPromedio!: number;
}

export class WaitersReportModel {
  @ApiProperty({ format: 'date-time', type: String })
  desde!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  hasta!: Date;

  @ApiProperty({ type: () => [WaiterSalesModel] })
  meseros!: WaiterSalesModel[];

  @ApiProperty({ type: () => WaiterTotalsModel })
  totales!: WaiterTotalsModel;
}

export class CashMethodTotalModel {
  @ApiProperty({ enum: PaymentMethod, enumName: 'PaymentMethod' })
  metodo!: PaymentMethod;

  @ApiProperty({ example: 14 })
  pagos!: number;

  @ApiProperty({ example: 620000 })
  total!: number;
}

export class CashDayTotalModel {
  @ApiProperty({ example: '2026-10-01' })
  fecha!: string;

  @ApiProperty({ type: () => [CashMethodTotalModel] })
  metodos!: CashMethodTotalModel[];

  @ApiProperty({ example: 620000 })
  total!: number;
}

export class CashTotalsModel {
  @ApiProperty({ example: 14 })
  pagos!: number;

  @ApiProperty({ example: 620000 })
  total!: number;
}

export class CashReportModel {
  @ApiProperty({ format: 'date-time', type: String })
  desde!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  hasta!: Date;

  @ApiProperty({ type: () => [CashMethodTotalModel] })
  porMetodo!: CashMethodTotalModel[];

  @ApiProperty({ type: () => [CashDayTotalModel] })
  porDia!: CashDayTotalModel[];

  @ApiProperty({ type: () => CashTotalsModel })
  totales!: CashTotalsModel;
}

export class PreparationAreaAverageModel {
  @ApiProperty({ enum: PreparationArea, enumName: 'PreparationArea' })
  area!: PreparationArea;

  @ApiProperty({ example: 32 })
  items!: number;

  @ApiProperty({ example: 480 })
  promedioSegundos!: number;

  @ApiProperty({ example: 8 })
  promedioMinutos!: number;
}

export class PreparationTotalsModel {
  @ApiProperty({ example: 64 })
  items!: number;

  @ApiProperty({ example: 505 })
  promedioSegundos!: number;

  @ApiProperty({ example: 8.42 })
  promedioMinutos!: number;
}

export class PreparationReportModel {
  @ApiProperty({ format: 'date-time', type: String })
  desde!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  hasta!: Date;

  @ApiProperty({ type: () => [PreparationAreaAverageModel] })
  areas!: PreparationAreaAverageModel[];

  @ApiProperty({ type: () => PreparationTotalsModel })
  total!: PreparationTotalsModel;
}
