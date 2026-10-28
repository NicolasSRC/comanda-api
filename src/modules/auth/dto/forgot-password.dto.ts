import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@demo.com' })
  @IsEmail({}, { message: 'El correo no es válido' })
  email!: string;
}
