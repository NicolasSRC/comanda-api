import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateTaxDto {
  @ApiProperty({ example: 'IVA', minLength: 2, maxLength: 60 })
  @IsString()
  @Length(2, 60, { message: 'El nombre debe tener entre 2 y 60 caracteres' })
  nombre!: string;

  @ApiProperty({ example: 1900, minimum: 0, maximum: 10000, description: 'Puntos base' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  tasaBps!: number;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateTaxDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 60 })
  @IsOptional()
  @IsString()
  @Length(2, 60, { message: 'El nombre debe tener entre 2 y 60 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  tasaBps?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class QueryTaxesDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: 'Busca por nombre' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
