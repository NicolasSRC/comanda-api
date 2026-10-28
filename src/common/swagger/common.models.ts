import { ApiProperty } from '@nestjs/swagger';

/** Respuesta genérica para operaciones que solo confirman el resultado. */
export class MessageResponseModel {
  @ApiProperty({ example: 'Sesión cerrada correctamente' })
  message!: string;
}

/** Referencia mínima a un usuario (mesero, cajero, administrador…). */
export class UserRefModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ana Gómez' })
  fullName!: string;
}

/** Referencia mínima a una entidad con nombre. */
export class NamedRefModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Salón principal' })
  name!: string;
}

/** Confirmación de una eliminación lógica. */
export class RemovedResponseModel {
  @ApiProperty({ example: true })
  removed!: true;
}

/** Metadatos de cualquier listado paginado. */
export class PaginationMetaModel {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
