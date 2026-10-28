import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ComboItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'El producto no es válido' })
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'La variante no es válida' })
  variantId?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity?: number;
}

export class CreateComboDto {
  @ApiProperty({ example: 'Combo almuerzo', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 35000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El precio no puede ser negativo' })
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [ComboItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1, { message: 'El combo debe incluir al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items!: ComboItemDto[];
}

export class UpdateComboDto {
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
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [ComboItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'El combo debe incluir al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items?: ComboItemDto[];
}

export class QueryCombosDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Busca por nombre' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
