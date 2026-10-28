import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CreateMenuVersionDto,
  DuplicateMenuVersionDto,
  QueryMenuVersionsDto,
} from './dto/menu.dto';
import { MenuService } from './menu.service';

@ApiTags('Carta - Versiones')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('cartas')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un borrador de carta con la configuración actual' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateMenuVersionDto) {
    return this.menu.createVersion(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar versiones de carta' })
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryMenuVersionsDto) {
    return this.menu.listVersions(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una versión con su snapshot' })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.menu.findVersion(actor, id);
  }

  @Post(':id/publicar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publicar una versión (archiva la anterior)' })
  publish(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.menu.publish(actor, id);
  }

  @Post(':id/duplicar')
  @ApiOperation({ summary: 'Duplicar una versión como nuevo borrador' })
  duplicate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DuplicateMenuVersionDto,
  ) {
    return this.menu.duplicate(actor, id, dto);
  }

  @Get(':id/previsualizar')
  @ApiOperation({
    summary: 'Previsualizar la carta (incluye productos agotados)',
    description: 'Mismo contrato que la carta pública, pero autenticado.',
  })
  preview(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.menu.preview(actor, id);
  }
}
