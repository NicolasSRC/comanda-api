import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CreateUserDto, QueryUsersDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un usuario del restaurante' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios del restaurante' })
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryUsersDto) {
    return this.usersService.list(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario del restaurante' })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar nombre, rol o estado de un usuario' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(actor, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un usuario (soft delete)' })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.usersService.deactivate(actor, id);
  }

  @Post(':id/reactivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivar un usuario desactivado' })
  reactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.usersService.reactivate(actor, id);
  }
}
