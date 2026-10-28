import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AccountsService } from './accounts.service';
import {
  CreateDiscountDto,
  CreatePaymentDto,
  CreateSplitsDto,
  QueryAccountDto,
  UpdateTipDto,
  VoidAccountDto,
} from './dto/account.dto';

@ApiTags('Cuentas')
@ApiBearerAuth()
@Controller('cuentas')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Obtener la cuenta abierta de una mesa (RF-50)' })
  findByTable(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryAccountDto) {
    return this.accounts.findByTable(actor, query.mesaId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Obtener el detalle y los totales de una cuenta' })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.accounts.detail(actor, id);
  }

  @Post(':id/descuentos')
  @Roles(Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Aplicar un descuento por ítem o por cuenta (RF-53)' })
  applyDiscount(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateDiscountDto,
  ) {
    return this.accounts.applyDiscount(actor, id, dto);
  }

  @Post(':id/propina')
  @Roles(Role.CASHIER, Role.ADMIN)
  @ApiOperation({ summary: 'Aplicar, cambiar o retirar la propina (RF-52)' })
  updateTip(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTipDto,
  ) {
    return this.accounts.updateTip(actor, id, dto);
  }

  @Post(':id/pagos')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Registrar un pago total o parcial (RF-55)' })
  registerPayment(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.accounts.registerPayment(actor, id, dto);
  }

  @Post(':id/divisiones')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Dividir la cuenta por comensales o por ítems (RF-54)' })
  createSplits(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateSplitsDto,
  ) {
    return this.accounts.createSplits(actor, id, dto);
  }

  @Post(':id/cerrar')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Cerrar una cuenta totalmente pagada (RF-56)' })
  close(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.accounts.close(actor, id);
  }

  @Post(':id/anular')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Anular una cuenta cerrada con motivo (RF-57)' })
  voidAccount(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: VoidAccountDto,
  ) {
    return this.accounts.voidAccount(actor, id, dto.motivo);
  }
}
