import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateModifierGroupDto {
  @ApiProperty({ example: 'Adiciones', minLength: 2, maxLength: 80 })
  @IsString()
  @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres' })
  name!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSelections?: number;

  @ApiPropertyOptional({ default: 1, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxSelections?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
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

export class UpdateModifierGroupDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres' })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSelections?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxSelections?: number;

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

export class CreateModifierDto {
  @ApiProperty({ example: 'Queso extra', minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80, { message: 'El nombre debe tener entre 1 y 80 caracteres' })
  name!: string;

  @ApiPropertyOptional({ example: 2000, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El costo extra no puede ser negativo' })
  extraPrice?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
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

export class UpdateModifierDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80, { message: 'El nombre debe tener entre 1 y 80 caracteres' })
  name?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El costo extra no puede ser negativo' })
  extraPrice?: number;

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

export class QueryModifierGroupsDto extends PaginationQueryDto {
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

export class AssociateModifierGroupDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'El grupo no es válido' })
  groupId!: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
