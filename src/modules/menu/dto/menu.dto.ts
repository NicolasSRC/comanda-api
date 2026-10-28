import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateMenuVersionDto {
  @ApiProperty({ example: 'Carta salón 2026', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  name!: string;
}

export class DuplicateMenuVersionDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  name?: string;
}

export class QueryMenuVersionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nombre' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Solo la versión publicada' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  published?: boolean;
}
