import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemStatus, OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class OrderItemModifierDto {
  @ApiProperty({ description: 'Modificador elegido' })
  @IsUUID()
  modificadorId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 99 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  cantidad?: number;
}

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Producto de la carta' })
  @IsUUID()
  productoId!: string;

  @ApiPropertyOptional({
    description: 'Variante obligatoria si el producto tiene variantes activas',
  })
  @IsOptional()
  @IsUUID()
  varianteId?: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  cantidad!: number;

  @ApiPropertyOptional({ type: [OrderItemModifierDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemModifierDto)
  modificadores?: OrderItemModifierDto[];

  @ApiPropertyOptional({ example: 'Sin cebolla', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Mesa que recibe el pedido' })
  @IsUUID()
  mesaId!: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  comensales!: number;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}

export class AddOrderItemsDto {
  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export class ChangeOrderItemStatusDto {
  @ApiProperty({ enum: OrderItemStatus, example: OrderItemStatus.IN_PREPARATION })
  @IsEnum(OrderItemStatus)
  estado!: OrderItemStatus;
}

export class CancelOrderItemDto {
  @ApiProperty({ example: 'El cliente cambió de opinión', minLength: 3, maxLength: 300 })
  @IsString()
  @Length(3, 300, { message: 'El motivo debe tener entre 3 y 300 caracteres' })
  motivo!: string;
}

export class MoveOrderDto {
  @ApiProperty({ description: 'Mesa destino' })
  @IsUUID()
  mesaId!: string;
}

export class MergeOrdersDto {
  @ApiProperty({ description: 'Pedido abierto que recibe los ítems' })
  @IsUUID()
  pedidoDestinoId!: string;
}

export class QueryOrdersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por mesa' })
  @IsOptional()
  @IsUUID()
  mesaId?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  estado?: OrderStatus;
}

export class QueryAreaItemsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: OrderItemStatus,
    description: 'Por defecto devuelve los ítems pendientes, en preparación y listos',
  })
  @IsOptional()
  @IsEnum(OrderItemStatus)
  estado?: OrderItemStatus;
}
