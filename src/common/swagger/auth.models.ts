import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MessageResponseModel } from './common.models';

export class RestaurantRefModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Restaurante Demo' })
  name!: string;

  @ApiProperty({ example: 'demo' })
  slug!: string;
}

/** Usuario expuesto en sesiones y perfiles. */
export class PublicUserModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@demo.com' })
  email!: string;

  @ApiProperty({ example: 'Administrador Demo' })
  fullName!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  restaurantId!: string | null;

  @ApiProperty({
    type: () => RestaurantRefModel,
    nullable: true,
    description: 'Restaurante asociado; `null` para superadministradores.',
  })
  restaurant!: RestaurantRefModel | null;
}

/** Par de tokens emitido al iniciar sesión o renovar la sesión. */
export class SessionResponseModel {
  @ApiProperty({ description: 'JWT de acceso para el encabezado Authorization.' })
  accessToken!: string;

  @ApiProperty({ example: 900, description: 'Vigencia del access token en segundos.' })
  expiresIn!: number;

  @ApiProperty({ description: 'Refresh token de un solo uso.' })
  refreshToken!: string;

  @ApiProperty({ format: 'date-time', type: String })
  refreshExpiresAt!: Date;

  @ApiProperty({ type: () => PublicUserModel })
  user!: PublicUserModel;
}

/** Resultado de solicitar la recuperación de contraseña. */
export class ForgotPasswordResponseModel extends MessageResponseModel {
  @ApiProperty({
    required: false,
    description: 'Solo se devuelve fuera de producción para probar el flujo.',
  })
  resetToken?: string;
}

/** Usuario del restaurante administrado desde el panel. */
export class UserModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'mesero@demo.com' })
  email!: string;

  @ApiProperty({ example: 'Mesero Demo' })
  fullName!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  restaurantId!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  lastLoginAt!: Date | null;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;
}
