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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, QueryCategoriesDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Carta - Categorías')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('categorias')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una categoría de la carta' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    return this.categories.create(actor, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER)
  @ApiOperation({ summary: 'Listar categorías del restaurante' })
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryCategoriesDto) {
    return this.categories.list(actor, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER)
  @ApiOperation({ summary: 'Obtener una categoría' })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.categories.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar una categoría' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(actor, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una categoría (soft delete)' })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.categories.deactivate(actor, id);
  }
}
