import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateZoneDto, QueryZonesDto, UpdateZoneDto } from './dto/zone.dto';
import { ZonesService } from './zones.service';

@ApiTags('Pedidos - Zonas')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('zonas')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una zona del restaurante' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateZoneDto) {
    return this.zones.create(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar zonas con sus mesas' })
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryZonesDto) {
    return this.zones.list(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una zona' })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.zones.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar una zona' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.zones.update(actor, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una zona sin mesas (soft delete)' })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.zones.deactivate(actor, id);
  }
}
