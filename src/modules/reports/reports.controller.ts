import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CashReportModel,
  PreparationReportModel,
  ProductsReportModel,
  SalesReportModel,
  WaitersReportModel,
} from '../../common/swagger/reports.models';
import {
  CashReportQueryDto,
  PreparationReportQueryDto,
  ProductsReportQueryDto,
  SalesReportQueryDto,
  WaitersReportQueryDto,
} from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reportes')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('ventas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ventas por día, semana o mes' })
  @ApiOkResponse({ type: SalesReportModel })
  sales(@CurrentUser() actor: AuthenticatedUser, @Query() query: SalesReportQueryDto) {
    return this.reports.sales(actor, query);
  }

  @Get('ventas.csv')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Exportar ventas a CSV' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'Archivo CSV con el resumen de ventas del rango solicitado.',
    schema: { type: 'string', format: 'binary' },
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="ventas.csv"')
  salesCsv(@CurrentUser() actor: AuthenticatedUser, @Query() query: SalesReportQueryDto) {
    return this.reports.salesCsv(actor, query);
  }

  @Get('productos')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Productos más y menos vendidos, y ventas por categoría' })
  @ApiOkResponse({ type: ProductsReportModel })
  products(@CurrentUser() actor: AuthenticatedUser, @Query() query: ProductsReportQueryDto) {
    return this.reports.products(actor, query);
  }

  @Get('meseros')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ventas por mesero' })
  @ApiOkResponse({ type: WaitersReportModel })
  waiters(@CurrentUser() actor: AuthenticatedUser, @Query() query: WaitersReportQueryDto) {
    return this.reports.waiters(actor, query);
  }

  @Get('caja')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Cierre de caja por turno y método de pago' })
  @ApiOkResponse({ type: CashReportModel })
  cash(@CurrentUser() actor: AuthenticatedUser, @Query() query: CashReportQueryDto) {
    return this.reports.cash(actor, query);
  }

  @Get('tiempos-preparacion')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tiempo promedio de preparación por área' })
  @ApiOkResponse({ type: PreparationReportModel })
  preparation(@CurrentUser() actor: AuthenticatedUser, @Query() query: PreparationReportQueryDto) {
    return this.reports.preparation(actor, query);
  }
}
