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
import {
  ApiArrayResponse,
  ApiPaginatedResponse,
} from '../../common/swagger/api-response.decorators';
import {
  ProductDetailModel,
  ProductListItemModel,
  ProductModifierGroupModel,
  VariantModel,
} from '../../common/swagger/catalog.models';
import { RemovedResponseModel } from '../../common/swagger/common.models';
import { AssociateModifierGroupDto } from '../modifiers/dto/modifier.dto';
import {
  CreateProductDto,
  QueryProductsDto,
  UpdateAvailabilityDto,
  UpdateProductDto,
} from './dto/product.dto';
import { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto';
import { ProductsService } from './products.service';

@ApiTags('Carta - Productos')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('productos')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un producto de la carta' })
  @ApiCreatedResponse({ type: ProductDetailModel })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return this.products.create(actor, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER)
  @ApiOperation({ summary: 'Listar productos con filtros' })
  @ApiPaginatedResponse(ProductListItemModel)
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: QueryProductsDto) {
    return this.products.list(actor, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER)
  @ApiOperation({ summary: 'Obtener un producto con variantes y modificadores' })
  @ApiOkResponse({ type: ProductDetailModel })
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.products.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un producto' })
  @ApiOkResponse({ type: ProductDetailModel })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(actor, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un producto (soft delete)' })
  @ApiOkResponse({ type: ProductDetailModel })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.products.deactivate(actor, id);
  }

  @Patch(':id/disponibilidad')
  @ApiOperation({ summary: 'Marcar el producto como agotado o disponible' })
  @ApiOkResponse({ type: ProductDetailModel })
  setAvailability(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.products.setAvailability(actor, id, dto);
  }

  @Get(':id/variantes')
  @Roles(Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER)
  @ApiOperation({ summary: 'Listar las variantes de un producto' })
  @ApiArrayResponse(VariantModel)
  listVariants(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.products.listVariants(actor, id);
  }

  @Post(':id/variantes')
  @ApiOperation({ summary: 'Crear una variante del producto' })
  @ApiCreatedResponse({ type: VariantModel })
  createVariant(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.products.createVariant(actor, id, dto);
  }

  @Patch(':id/variantes/:variantId')
  @ApiOperation({ summary: 'Editar una variante del producto' })
  @ApiOkResponse({ type: VariantModel })
  updateVariant(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.products.updateVariant(actor, id, variantId, dto);
  }

  @Delete(':id/variantes/:variantId')
  @ApiOperation({ summary: 'Desactivar una variante (soft delete)' })
  @ApiOkResponse({ type: VariantModel })
  deactivateVariant(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
  ) {
    return this.products.deactivateVariant(actor, id, variantId);
  }

  @Post(':id/grupos-modificadores')
  @ApiOperation({ summary: 'Asociar un grupo de modificadores al producto' })
  @ApiCreatedResponse({ type: ProductModifierGroupModel })
  associateModifierGroup(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssociateModifierGroupDto,
  ) {
    return this.products.associateModifierGroup(actor, id, dto);
  }

  @Delete(':id/grupos-modificadores/:groupId')
  @ApiOperation({ summary: 'Quitar un grupo de modificadores del producto' })
  @ApiOkResponse({ type: RemovedResponseModel })
  removeModifierGroup(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
  ) {
    return this.products.removeModifierGroup(actor, id, groupId);
  }
}
