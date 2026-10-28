import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({ example: 'Personal', minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80, { message: 'El nombre debe tener entre 1 y 80 caracteres' })
  name!: string;

  @ApiProperty({ example: 18000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El precio no puede ser negativo' })
  price!: number;

  @ApiPropertyOptional({ example: 0 })
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

export class UpdateVariantDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80, { message: 'El nombre debe tener entre 1 y 80 caracteres' })
  name?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;

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
