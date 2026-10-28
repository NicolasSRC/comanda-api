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
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ApiPaginatedResponse } from '../../common/swagger/api-response.decorators';
import {
  AccountConfigModel,
  CreatedRestaurantModel,
  RestaurantModel,
} from '../../common/swagger/restaurants.models';
import {
  CreateRestaurantDto,
  UpdateAccountConfigDto,
  UpdateRestaurantDto,
} from './dto/restaurant.dto';
import { RestaurantsService } from './restaurants.service';

@ApiTags('Restaurantes')
@ApiBearerAuth()
@Controller('restaurantes')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get('me')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener el restaurante del usuario autenticado' })
  @ApiOkResponse({ type: RestaurantModel })
  findMine(@CurrentUser() actor: AuthenticatedUser) {
    return this.restaurantsService.findMine(actor);
  }

  @Get('me/configuracion-cuenta')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener la configuración de cuentas del restaurante' })
  @ApiOkResponse({ type: AccountConfigModel })
  getAccountConfig(@CurrentUser() actor: AuthenticatedUser) {
    return this.restaurantsService.getAccountConfig(actor);
  }

  @Patch('me/configuracion-cuenta')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Editar impuestos, propina y umbral de descuentos' })
  @ApiOkResponse({ type: AccountConfigModel })
  updateAccountConfig(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateAccountConfigDto,
  ) {
    return this.restaurantsService.updateAccountConfig(actor, dto);
  }

  @Post()
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Crear un restaurante y su primer administrador (superadmin)' })
  @ApiCreatedResponse({ type: CreatedRestaurantModel })
  create(@Body() dto: CreateRestaurantDto) {
    return this.restaurantsService.create(dto);
  }

  @Get()
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Listar restaurantes (superadmin)' })
  @ApiPaginatedResponse(RestaurantModel)
  list(@Query() query: PaginationQueryDto) {
    return this.restaurantsService.list(query.page, query.limit);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Obtener un restaurante (superadmin)' })
  @ApiOkResponse({ type: RestaurantModel })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Editar un restaurante (superadmin)' })
  @ApiOkResponse({ type: RestaurantModel })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateRestaurantDto) {
    return this.restaurantsService.update(id, dto);
  }
}
