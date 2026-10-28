import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con correo y contraseña' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos de inicio de sesión' })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    });
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar el access token con rotación del refresh token' })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto.refreshToken, {
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    });
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión y revocar la familia de refresh tokens' })
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer la contraseña con un token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar la contraseña del usuario autenticado' })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }
}
