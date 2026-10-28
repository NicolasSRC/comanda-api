import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

/**
 * Configuración compartida entre `main.ts` y las pruebas e2e, para que ambas
 * ejecuten exactamente el mismo pipeline de validación.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.use(
    helmet({
      // Swagger UI necesita estilos y scripts inline para renderizar.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  const corsOrigins = config.getOrThrow<string>('CORS_ORIGINS');
  app.enableCors({
    origin:
      corsOrigins === '*'
        ? true
        : corsOrigins
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableShutdownHooks();
}
