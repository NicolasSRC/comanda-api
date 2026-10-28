import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Entradas', minLength: 2, maxLength: 80 })
  @IsString()
  @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres' })
  name!: string;

  @ApiPropertyOptional({ example: 'Para empezar', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres' })
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
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryCategoriesDto extends PaginationQueryDto {
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
