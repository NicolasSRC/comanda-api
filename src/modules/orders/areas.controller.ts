import { Controller, Get, Param, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PreparationArea, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { QueryAreaItemsDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Pedidos - Áreas')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.KITCHEN)
@Controller('areas')
export class AreasController {
  constructor(private readonly orders: OrdersService) {}

  @Get(':area/items-pendientes')
  @ApiOperation({ summary: 'Cola de preparación del área ordenada por antigüedad (RF-47)' })
  queue(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('area', new ParseEnumPipe(PreparationArea)) area: PreparationArea,
    @Query() query: QueryAreaItemsDto,
  ) {
    return this.orders.areaQueue(actor, area, query);
  }
}
