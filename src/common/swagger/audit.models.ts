import { ApiProperty } from '@nestjs/swagger';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  type AuditAction,
  type AuditEntityType,
} from '../../modules/audit/dto/audit.dto';

export class AuditUserModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Administrador Demo' })
  nombre!: string;
}

/** Acción sensible registrada en la bitácora. */
export class AuditLogModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AUDIT_ACTIONS, enumName: 'AuditAction' })
  accion!: AuditAction;

  @ApiProperty({ enum: AUDIT_ENTITY_TYPES, enumName: 'AuditEntityType' })
  entidad!: AuditEntityType;

  @ApiProperty({ format: 'uuid' })
  entidadId!: string;

  @ApiProperty({ type: () => AuditUserModel, nullable: true })
  usuario!: AuditUserModel | null;

  @ApiProperty({ type: Object, additionalProperties: true, nullable: true })
  antes!: Record<string, unknown> | null;

  @ApiProperty({ type: Object, additionalProperties: true, nullable: true })
  despues!: Record<string, unknown> | null;

  @ApiProperty({ type: Object, additionalProperties: true, nullable: true })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ format: 'date-time', type: String })
  creadoEn!: Date;
}
