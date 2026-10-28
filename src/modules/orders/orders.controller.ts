import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ApiPaginatedResponse } from '../../common/swagger/api-response.decorators';
import { OrderItemModel, OrderListItemModel, OrderModel } from '../../common/swagger/orders.models';
import {
  AddOrderItemsDto,
  CancelOrderItemDto,
  ChangeOrderItemStatusDto,
  CreateOrderDto,
  MergeOrdersDto,
  MoveOrderDto,
  QueryOrdersDto,
} from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Pedidos')
@ApiBearerAuth()
@Controller('pedidos')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Crear un pedido con ítems y precios congelados' })
  @ApiCreatedResponse({ type: OrderModel })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(actor, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Listar pedidos con filtros por mesa y estado' })
  @ApiPaginatedResponse(OrderListItemModel)
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryOrdersDto) {
    return this.orders.list(actor, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Obtener el detalle de un pedido con sus totales' })
  @ApiOkResponse({ type: OrderModel })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.orders.findOne(actor, id);
  }

  @Post(':id/items')
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Agregar ítems a un pedido abierto' })
  @ApiCreatedResponse({ type: OrderModel })
  addItems(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddOrderItemsDto,
  ) {
    return this.orders.addItems(actor, id, dto);
  }

  @Patch(':id/items/:itemId/estado')
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN)
  @ApiOperation({ summary: 'Cambiar el estado de un ítem' })
  @ApiOkResponse({ type: OrderItemModel })
  changeItemStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: ChangeOrderItemStatusDto,
  ) {
    return this.orders.changeItemStatus(actor, id, itemId, dto);
  }

  @Post(':id/items/:itemId/cancelar')
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Cancelar un ítem con motivo' })
  @ApiCreatedResponse({ type: OrderItemModel })
  cancelItem(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: CancelOrderItemDto,
  ) {
    return this.orders.cancelItem(actor, id, itemId, dto);
  }

  @Post(':id/mover')
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Mover un pedido abierto a otra mesa' })
  @ApiCreatedResponse({ type: OrderModel })
  move(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MoveOrderDto,
  ) {
    return this.orders.move(actor, id, dto);
  }

  @Post(':id/unir')
  @Roles(Role.ADMIN, Role.WAITER)
  @ApiOperation({ summary: 'Unir los ítems de un pedido en otro' })
  @ApiCreatedResponse({ type: OrderModel })
  merge(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MergeOrdersDto,
  ) {
    return this.orders.merge(actor, id, dto);
  }
}
