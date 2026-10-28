import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountScope, DiscountType, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Tipos de división admitidos (RF-54). */
export const SPLIT_KINDS = ['COMENSAL', 'ITEMS'] as const;
export type SplitKind = (typeof SPLIT_KINDS)[number];

export class QueryAccountDto {
  @ApiProperty({ description: 'Mesa de la que se consulta la cuenta abierta' })
  @IsUUID()
  mesaId!: string;
}

export class CreateDiscountDto {
  @ApiProperty({ enum: DiscountScope, description: 'Ítem o total de la cuenta' })
  @IsEnum(DiscountScope)
  alcance!: DiscountScope;

  @ApiProperty({ enum: DiscountType, description: 'PERCENT usa puntos base; FIXED usa dinero' })
  @IsEnum(DiscountType)
  tipo!: DiscountType;

  @ApiProperty({ example: 1000, minimum: 1, description: 'Puntos base o unidad mínima' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  valor!: number;

  @ApiPropertyOptional({ description: 'Requerido cuando el alcance es ITEM' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiProperty({ example: 'Cortesía del gerente', minLength: 3, maxLength: 300 })
  @IsString()
  @Length(3, 300, { message: 'El motivo debe tener entre 3 y 300 caracteres' })
  motivo!: string;
}

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  metodo!: PaymentMethod;

  @ApiProperty({ example: 20000, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  monto!: number;

  @ApiPropertyOptional({ description: 'División que se está pagando' })
  @IsOptional()
  @IsUUID()
  divisionId?: string;

  @ApiPropertyOptional({ example: 'Aprobación 123456', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referencia?: string;
}

export class UpdateTipDto {
  @ApiProperty({
    example: 1000,
    minimum: 0,
    maximum: 10000,
    description: 'Puntos base; 0 retira la propina',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  porcentajeBps!: number;
}

export class SplitItemDto {
  @ApiProperty({ description: 'Ítem del pedido' })
  @IsUUID()
  itemId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 99 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  cantidad?: number;
}

export class SplitGroupDto {
  @ApiProperty({ example: 'Ana', minLength: 1, maxLength: 60 })
  @IsString()
  @Length(1, 60)
  etiqueta!: string;

  @ApiProperty({ type: [SplitItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SplitItemDto)
  items!: SplitItemDto[];
}

export class CreateSplitsDto {
  @ApiProperty({ enum: SPLIT_KINDS, example: 'COMENSAL' })
  @IsIn(SPLIT_KINDS)
  tipo!: SplitKind;

  @ApiPropertyOptional({ example: 4, minimum: 2, maximum: 99 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(99)
  comensales?: number;

  @ApiPropertyOptional({ type: [SplitGroupDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SplitGroupDto)
  grupos?: SplitGroupDto[];
}

export class VoidAccountDto {
  @ApiProperty({ example: 'Cobro duplicado', minLength: 3, maxLength: 300 })
  @IsString()
  @Length(3, 300, { message: 'El motivo debe tener entre 3 y 300 caracteres' })
  motivo!: string;
}
