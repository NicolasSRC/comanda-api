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
import { TaxModel } from '../../common/swagger/accounts.models';
import { ApiPaginatedResponse } from '../../common/swagger/api-response.decorators';
import { CreateTaxDto, QueryTaxesDto, UpdateTaxDto } from './dto/tax.dto';
import { TaxesService } from './taxes.service';

@ApiTags('Cuentas - Impuestos')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('impuestos')
export class TaxesController {
  constructor(private readonly taxes: TaxesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un impuesto del restaurante' })
  @ApiCreatedResponse({ type: TaxModel })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateTaxDto) {
    return this.taxes.create(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar impuestos' })
  @ApiPaginatedResponse(TaxModel)
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryTaxesDto) {
    return this.taxes.list(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un impuesto' })
  @ApiOkResponse({ type: TaxModel })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.taxes.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un impuesto' })
  @ApiOkResponse({ type: TaxModel })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaxDto,
  ) {
    return this.taxes.update(actor, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un impuesto (soft delete)' })
  @ApiOkResponse({ type: TaxModel })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.taxes.deactivate(actor, id);
  }
}
