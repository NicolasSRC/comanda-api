import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export const AUDIT_ACTIONS = [
  'CANCEL_ITEM',
  'APPLY_DISCOUNT',
  'VOID_ACCOUNT',
  'UPDATE_PRODUCT_PRICE',
  'UPDATE_VARIANT_PRICE',
  'CREATE_PRICE_RULE',
  'UPDATE_PRICE_RULE',
  'DEACTIVATE_PRICE_RULE',
  'UPDATE_COMBO_PRICE',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  'OrderItem',
  'Discount',
  'Account',
  'Product',
  'Variant',
  'PriceRule',
  'Combo',
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsISO8601()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsISO8601()
  hasta?: string;

  @ApiPropertyOptional({ enum: AUDIT_ACTIONS, example: 'APPLY_DISCOUNT' })
  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  accion?: AuditAction;

  @ApiPropertyOptional({ enum: AUDIT_ENTITY_TYPES, example: 'Discount' })
  @IsOptional()
  @IsIn(AUDIT_ENTITY_TYPES)
  entidad?: AuditEntityType;

  @ApiPropertyOptional({ description: 'Id de la entidad auditada' })
  @IsOptional()
  @IsUUID()
  entidadId?: string;

  @ApiPropertyOptional({ description: 'Usuario que ejecutó la acción' })
  @IsOptional()
  @IsUUID()
  usuarioId?: string;
}
