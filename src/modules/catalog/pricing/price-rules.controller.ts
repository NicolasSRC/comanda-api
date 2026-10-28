import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ApiArrayResponse } from '../../../common/swagger/api-response.decorators';
import { AvailabilityWindowModel, PriceRuleModel } from '../../../common/swagger/catalog.models';
import {
  CreateAvailabilityWindowDto,
  CreatePriceRuleDto,
  UpdatePriceRuleDto,
} from '../dto/price-rule.dto';
import { PriceRulesService } from './price-rules.service';

@ApiTags('Carta - Precios y disponibilidad')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('productos')
export class PriceRulesController {
  constructor(private readonly priceRules: PriceRulesService) {}

  @Get(':id/reglas-precio')
  @ApiOperation({ summary: 'Listar las reglas de precio de un producto' })
  @ApiArrayResponse(PriceRuleModel)
  listRules(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.priceRules.listRules(actor, id);
  }

  @Post(':id/reglas-precio')
  @ApiOperation({ summary: 'Crear una regla de precio por días y horario' })
  @ApiCreatedResponse({ type: PriceRuleModel })
  createRule(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreatePriceRuleDto,
  ) {
    return this.priceRules.createRule(actor, id, dto);
  }

  @Patch(':id/reglas-precio/:ruleId')
  @ApiOperation({ summary: 'Editar una regla de precio' })
  @ApiOkResponse({ type: PriceRuleModel })
  updateRule(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
    @Body() dto: UpdatePriceRuleDto,
  ) {
    return this.priceRules.updateRule(actor, id, ruleId, dto);
  }

  @Delete(':id/reglas-precio/:ruleId')
  @ApiOperation({ summary: 'Desactivar una regla de precio (soft delete)' })
  @ApiOkResponse({ type: PriceRuleModel })
  deactivateRule(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
  ) {
    return this.priceRules.deactivateRule(actor, id, ruleId);
  }

  @Get(':id/disponibilidad')
  @ApiOperation({ summary: 'Listar las ventanas de disponibilidad de un producto' })
  @ApiArrayResponse(AvailabilityWindowModel)
  listWindows(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.priceRules.listWindows(actor, id);
  }

  @Post(':id/disponibilidad')
  @ApiOperation({ summary: 'Crear una ventana de disponibilidad por días y horario' })
  @ApiCreatedResponse({ type: AvailabilityWindowModel })
  createWindow(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateAvailabilityWindowDto,
  ) {
    return this.priceRules.createWindow(actor, id, dto);
  }

  @Delete(':id/disponibilidad/:windowId')
  @ApiOperation({ summary: 'Desactivar una ventana de disponibilidad (soft delete)' })
  @ApiOkResponse({ type: AvailabilityWindowModel })
  deactivateWindow(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('windowId', new ParseUUIDPipe()) windowId: string,
  ) {
    return this.priceRules.deactivateWindow(actor, id, windowId);
  }
}
