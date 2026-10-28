import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Comanda API')
    .setDescription(
      'API multi-restaurante para cartas personalizables, pedidos, cuentas y reportes.',
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Access token obtenido en POST /auth/login',
    })
    .addTag('Autenticación')
    .addTag('Usuarios')
    .addTag('Restaurantes')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/json',
  });

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');

  Logger.log(`Comanda API escuchando en http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Documentación OpenAPI en http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();
