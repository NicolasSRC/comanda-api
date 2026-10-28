import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipBase } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_PATTERN } from '../../auth/dto/change-password.dto';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Restaurante Demo' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'demo', description: 'Identificador público para la carta' })
  @IsString()
  @MaxLength(80)
  @Matches(SLUG_PATTERN, {
    message: 'El slug solo admite minúsculas, números y guiones',
  })
  slug!: string;

  @ApiPropertyOptional({ example: 'COP', description: 'Código ISO 4217' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: 'America/Bogota' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @ApiProperty({ example: 'admin@demo.com' })
  @IsEmail({}, { message: 'El correo del administrador no es válido' })
  adminEmail!: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(8, { message: PASSWORD_MESSAGE })
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  adminPassword!: string;

  @ApiProperty({ example: 'Administrador Demo' })
  @IsString()
  @Length(2, 120)
  adminFullName!: string;
}

export class UpdateRestaurantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAccountConfigDto {
  @ApiPropertyOptional({
    description: 'Si los precios de la carta ya incluyen impuestos (RF-51)',
  })
  @IsOptional()
  @IsBoolean()
  preciosIncluyenImpuesto?: boolean;

  @ApiPropertyOptional({ description: 'Habilita la propina sugerida (RF-52)' })
  @IsOptional()
  @IsBoolean()
  propinaHabilitada?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000, description: 'Puntos base' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  propinaSugeridaBps?: number;

  @ApiPropertyOptional({ enum: TipBase, description: 'Base para calcular la propina' })
  @IsOptional()
  @IsEnum(TipBase)
  basePropina?: TipBase;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 10000,
    description: 'Umbral de descuento que exige aprobación de administrador',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  umbralAprobacionDescuentoBps?: number;
}
