import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { PASSWORD_MESSAGE, PASSWORD_PATTERN } from '../../auth/dto/change-password.dto';

export class CreateUserDto {
  @ApiProperty({ example: 'mesero@demo.com' })
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Mesero123!' })
  @IsString()
  @MinLength(8, { message: PASSWORD_MESSAGE })
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password!: string;

  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  fullName!: string;

  @ApiProperty({ enum: [Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER] })
  @IsEnum(Role, { message: 'Rol inválido' })
  role!: Role;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ana María Pérez' })
  @IsOptional()
  @IsString()
  @Length(2, 120, { message: 'El nombre debe tener entre 2 y 120 caracteres' })
  fullName?: string;

  @ApiPropertyOptional({ enum: [Role.ADMIN, Role.WAITER, Role.KITCHEN, Role.CASHIER] })
  @IsOptional()
  @IsEnum(Role, { message: 'Rol inválido' })
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryUsersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'Rol inválido' })
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Busca por nombre o correo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
