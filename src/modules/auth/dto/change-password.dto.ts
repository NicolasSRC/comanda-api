import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
export const PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'La contraseña actual es obligatoria' })
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: PASSWORD_MESSAGE })
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
