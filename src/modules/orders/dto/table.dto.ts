import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateTableDto {
  @ApiProperty({ example: 'uuid', description: 'Zona a la que pertenece la mesa' })
  @IsUUID()
  zoneId!: string;

  @ApiProperty({ example: 'Mesa 1', minLength: 1, maxLength: 40 })
  @IsString()
  @Length(1, 40, { message: 'El nombre debe tener entre 1 y 40 caracteres' })
  name!: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  capacity!: number;
}

export class UpdateTableDto {
  @ApiPropertyOptional({ description: 'Nueva zona de la mesa' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 40 })
  @IsOptional()
  @IsString()
  @Length(1, 40, { message: 'El nombre debe tener entre 1 y 40 caracteres' })
  name?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  capacity?: number;
}

export class QueryTablesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por zona' })
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ enum: TableStatus })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @ApiPropertyOptional({ description: 'Busca por nombre' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class OpenTableDto {
  @ApiProperty({ example: 2, minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  comensales!: number;

  @ApiPropertyOptional({
    description: 'Mesero asignado. Por defecto, el usuario autenticado.',
  })
  @IsOptional()
  @IsUUID()
  meseroId?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
