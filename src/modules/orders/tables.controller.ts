import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateTableDto, OpenTableDto, QueryTablesDto, UpdateTableDto } from './dto/table.dto';
import { OrdersService } from './orders.service';
import { TablesService } from './tables.service';

@ApiTags('Pedidos - Mesas')
@ApiBearerAuth()
@Controller('mesas')
export class TablesController {
  constructor(
    private readonly tables: TablesService,
    private readonly orders: OrdersService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Listar mesas con su zona y pedido abierto' })
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryTablesDto) {
    return this.tables.list(actor, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Obtener una mesa' })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.tables.findOne(actor, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Crear una mesa' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateTableDto) {
    return this.tables.create(actor, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Editar una mesa' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tables.update(actor, id, dto);
  }

  @Post(':id/abrir')
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Abrir la mesa creando un pedido abierto (RF-32)' })
  open(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: OpenTableDto,
  ) {
    return this.orders.openTable(actor, id, dto);
  }
}
