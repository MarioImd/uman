/**
 * Punto de entrada del backend: crea la aplicación NestJS, la configura y
 * la pone a escuchar peticiones HTTP.
 */
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // Crea la app a partir del módulo raíz (AppModule), que a su vez carga la
  // conexión a Postgres y el módulo de registros. Se tipa como Express para
  // poder usar useBodyParser() más abajo.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Todas las rutas quedan bajo /api (p. ej. /api/registros), para separarlas
  // claramente de cualquier otra cosa que se sirva desde el mismo dominio.
  app.setGlobalPrefix('api');

  // CORS: el frontend Angular corre en otro origen (localhost:4200) y el
  // navegador bloquearía sus peticiones si el backend no lo autoriza aquí.
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200' });

  // Las firmas e imágenes (EKG, Rx, laboratorios) viajan como data URLs en base64
  // dentro del JSON del registro, así que el límite por defecto (100kb) no alcanza.
  app.useBodyParser('json', { limit: process.env.BODY_LIMIT ?? '50mb' });

  // Valida automáticamente el cuerpo de cada petición contra su DTO
  // (ver dto/guardar-registro.dto.ts) y responde 400 si algo no cumple.
  // whitelist: descarta las propiedades que el DTO no declara, para que no
  // se cuele basura a la base de datos.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Puerto configurable por variable de entorno (archivo .env); 3000 por defecto.
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
