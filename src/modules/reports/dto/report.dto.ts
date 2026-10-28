import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PreparationArea } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { type ReportGrouping } from '../../../common/utils/date-range';

export const REPORT_GROUPINGS: ReportGrouping[] = ['DIA', 'SEMANA', 'MES'];

export class ReportRangeDto {
  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Fecha inicial (ISO 8601); por defecto, últimos 30 días',
  })
  @IsOptional()
  @IsISO8601()
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Fecha final inclusive (ISO 8601); por defecto, ahora',
  })
  @IsOptional()
  @IsISO8601()
  hasta?: string;
}

export class SalesReportQueryDto extends ReportRangeDto {
  @ApiPropertyOptional({ enum: REPORT_GROUPINGS, default: 'DIA' })
  @IsOptional()
  @IsIn(REPORT_GROUPINGS)
  agrupacion: ReportGrouping = 'DIA';
}

export class ProductsReportQueryDto extends ReportRangeDto {
  @ApiPropertyOptional({ description: 'Filtra por categoría' })
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limite: number = 10;

  @ApiPropertyOptional({ enum: ['DESC', 'ASC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['DESC', 'ASC'])
  orden: 'DESC' | 'ASC' = 'DESC';
}

export class WaitersReportQueryDto extends ReportRangeDto {}

export class CashReportQueryDto extends ReportRangeDto {
  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  metodoPago?: PaymentMethod;
}

export class PreparationReportQueryDto extends ReportRangeDto {
  @ApiPropertyOptional({ enum: PreparationArea })
  @IsOptional()
  @IsEnum(PreparationArea)
  area?: PreparationArea;
}
