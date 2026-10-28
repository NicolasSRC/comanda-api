import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
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
  @ApiOperation({ summary: 'Ventas por día, semana o mes (RF-60)' })
  sales(@CurrentUser() actor: AuthenticatedUser, @Query() query: SalesReportQueryDto) {
    return this.reports.sales(actor, query);
  }

  @Get('ventas.csv')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Exportar ventas a CSV (RF-66)' })
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="ventas.csv"')
  salesCsv(@CurrentUser() actor: AuthenticatedUser, @Query() query: SalesReportQueryDto) {
    return this.reports.salesCsv(actor, query);
  }

  @Get('productos')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Productos más/menos vendidos y por categoría (RF-61/RF-62)' })
  products(@CurrentUser() actor: AuthenticatedUser, @Query() query: ProductsReportQueryDto) {
    return this.reports.products(actor, query);
  }

  @Get('meseros')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ventas por mesero (RF-61)' })
  waiters(@CurrentUser() actor: AuthenticatedUser, @Query() query: WaitersReportQueryDto) {
    return this.reports.waiters(actor, query);
  }

  @Get('caja')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Cierre de caja por turno y método de pago (RF-65)' })
  cash(@CurrentUser() actor: AuthenticatedUser, @Query() query: CashReportQueryDto) {
    return this.reports.cash(actor, query);
  }

  @Get('tiempos-preparacion')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tiempo promedio de preparación por área (RF-64)' })
  preparation(@CurrentUser() actor: AuthenticatedUser, @Query() query: PreparationReportQueryDto) {
    return this.reports.preparation(actor, query);
  }
}
