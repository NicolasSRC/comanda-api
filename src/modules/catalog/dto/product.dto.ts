import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreparationArea } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateProductDto {
  @ApiProperty({ format: 'uuid', description: 'Categoría del producto' })
  @IsUUID('4', { message: 'La categoría no es válida' })
  categoryId!: string;

  @ApiProperty({ example: 'Nachos', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  name!: string;

  @ApiPropertyOptional({ example: 'Con queso y guacamole', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 18000, minimum: 0, description: 'Unidad mínima de la moneda' })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El precio base no puede ser negativo' })
  basePrice!: number;

  @ApiPropertyOptional({ example: 'https://cdn.comanda.app/nachos.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiProperty({ enum: PreparationArea, example: PreparationArea.KITCHEN })
  @IsEnum(PreparationArea, { message: 'El área de preparación no es válida' })
  preparationArea!: PreparationArea;

  @ApiPropertyOptional({ default: true, description: 'Producto agotado si es false' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'La categoría no es válida' })
  categoryId?: string;

  @ApiPropertyOptional({ minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  name?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El precio base no puede ser negativo' })
  basePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ enum: PreparationArea })
  @IsOptional()
  @IsEnum(PreparationArea, { message: 'El área de preparación no es válida' })
  preparationArea?: PreparationArea;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ example: false, description: 'false marca el producto como agotado' })
  @IsBoolean()
  isAvailable!: boolean;
}

export class QueryProductsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'La categoría no es válida' })
  categoryId?: string;

  @ApiPropertyOptional({ enum: PreparationArea })
  @IsOptional()
  @IsEnum(PreparationArea, { message: 'El área de preparación no es válida' })
  preparationArea?: PreparationArea;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Busca por nombre o descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
