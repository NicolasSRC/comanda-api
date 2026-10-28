import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token opaco emitido al iniciar sesión' })
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
