import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Traduce errores conocidos de Prisma a respuestas HTTP claras. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno de base de datos';

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = 'Ya existe un registro con esos datos';
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'El registro no existe';
        break;
      case 'P2003':
        status = HttpStatus.CONFLICT;
        message = 'El registro está en uso y no se puede modificar';
        break;
      default:
        this.logger.error(`Error Prisma ${exception.code}: ${exception.message}`);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status] ?? 'Error',
      timestamp: new Date().toISOString(),
      path: host.switchToHttp().getRequest<{ url?: string }>().url,
    });
  }
}
