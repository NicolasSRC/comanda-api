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
import { CombosService } from './combos.service';
import { CreateComboDto, QueryCombosDto, UpdateComboDto } from './dto/combo.dto';

@ApiTags('Carta - Combos')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('combos')
export class CombosController {
  constructor(private readonly combos: CombosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un combo con sus productos' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateComboDto) {
    return this.combos.create(actor, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER)
  @ApiOperation({ summary: 'Listar combos' })
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryCombosDto) {
    return this.combos.list(actor, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER)
  @ApiOperation({ summary: 'Obtener un combo' })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.combos.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un combo o reemplazar sus productos' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateComboDto,
  ) {
    return this.combos.update(actor, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un combo (soft delete)' })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.combos.deactivate(actor, id);
  }
}
