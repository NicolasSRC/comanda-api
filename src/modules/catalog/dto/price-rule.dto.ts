import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
export const TIME_MESSAGE = 'La hora debe tener el formato HH:mm (00:00 a 23:59)';

export class CreatePriceRuleDto {
  @ApiProperty({ example: 'Happy hour', minLength: 2, maxLength: 80 })
  @IsString()
  @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres' })
  name!: string;

  @ApiProperty({ example: 9000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El precio no puede ser negativo' })
  price!: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Deja vacío para aplicar a todas las variantes',
  })
  @IsOptional()
  @IsUUID('4', { message: 'La variante no es válida' })
  variantId?: string;

  @ApiPropertyOptional({
    example: 127,
    default: 127,
    description: 'Bitmask: bit 0 = lunes … bit 6 = domingo. 127 = todos los días.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(127)
  daysOfWeek?: number;

  @ApiProperty({ example: '17:00' })
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  startTime!: string;

  @ApiProperty({ example: '19:00' })
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  endTime!: string;

  @ApiPropertyOptional({ default: 0, description: 'Mayor prioridad gana' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePriceRuleDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres' })
  name?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'La variante no es válida' })
  variantId?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 127 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(127)
  daysOfWeek?: number;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  startTime?: string;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  endTime?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateAvailabilityWindowDto {
  @ApiPropertyOptional({
    example: 127,
    default: 127,
    description: 'Bitmask: bit 0 = lunes … bit 6 = domingo.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(127)
  daysOfWeek?: number;

  @ApiProperty({ example: '12:00' })
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  startTime!: string;

  @ApiProperty({ example: '15:00' })
  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  endTime!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
