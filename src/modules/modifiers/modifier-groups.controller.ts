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
import {
  CreateModifierDto,
  CreateModifierGroupDto,
  QueryModifierGroupsDto,
  UpdateModifierDto,
  UpdateModifierGroupDto,
} from './dto/modifier.dto';
import { ModifierGroupsService } from './modifier-groups.service';

@ApiTags('Carta - Grupos de modificadores')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('grupos-modificadores')
export class ModifierGroupsController {
  constructor(private readonly groups: ModifierGroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un grupo de modificadores' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateModifierGroupDto) {
    return this.groups.create(actor, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER)
  @ApiOperation({ summary: 'Listar grupos de modificadores' })
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryModifierGroupsDto) {
    return this.groups.list(actor, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER)
  @ApiOperation({ summary: 'Obtener un grupo con sus modificadores' })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.groups.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un grupo de modificadores' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateModifierGroupDto,
  ) {
    return this.groups.update(actor, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un grupo (soft delete)' })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.groups.deactivate(actor, id);
  }

  @Get(':id/modificadores')
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER)
  @ApiOperation({ summary: 'Listar los modificadores del grupo' })
  listModifiers(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.groups.listModifiers(actor, id);
  }

  @Post(':id/modificadores')
  @ApiOperation({ summary: 'Crear un modificador con costo extra' })
  createModifier(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateModifierDto,
  ) {
    return this.groups.createModifier(actor, id, dto);
  }

  @Patch(':id/modificadores/:modifierId')
  @ApiOperation({ summary: 'Editar un modificador' })
  updateModifier(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('modifierId', new ParseUUIDPipe()) modifierId: string,
    @Body() dto: UpdateModifierDto,
  ) {
    return this.groups.updateModifier(actor, id, modifierId, dto);
  }

  @Delete(':id/modificadores/:modifierId')
  @ApiOperation({ summary: 'Desactivar un modificador (soft delete)' })
  deactivateModifier(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('modifierId', new ParseUUIDPipe()) modifierId: string,
  ) {
    return this.groups.deactivateModifier(actor, id, modifierId);
  }
}
