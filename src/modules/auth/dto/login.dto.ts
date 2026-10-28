import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.com' })
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(1, { message: 'La contraseña es obligatoria' })
  @MaxLength(128)
  password!: string;
}
