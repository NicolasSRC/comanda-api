import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_PATTERN } from './change-password.dto';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por correo' })
  @IsString()
  @MinLength(32, { message: 'Token inválido' })
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: PASSWORD_MESSAGE })
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
