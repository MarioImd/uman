/**
 * Módulo raíz de la aplicación. En NestJS cada "módulo" agrupa una parte de
 * la app; este junta la configuración, la conexión a la base de datos y los
 * módulos de negocio (por ahora solo RegistrosModule).
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrosModule } from './registros/registros.module';

@Module({
  imports: [
    // Lee el archivo .env y deja sus variables disponibles en toda la app
    // (isGlobal) a través de ConfigService.
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión a PostgreSQL con TypeORM (el ORM que traduce entre clases de
    // TypeScript y tablas SQL). Se usa forRootAsync para esperar a que
    // ConfigService ya haya leído el .env antes de conectarse.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        // Datos de conexión: salen del .env; los valores por defecto coinciden
        // con los del docker-compose.yml para que funcione sin configurar nada.
        host: config.get('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5432)),
        username: config.get('DB_USER', 'umam'),
        password: config.get('DB_PASSWORD', 'umam'),
        database: config.get('DB_NAME', 'umam'),
        // Registra solas las entidades declaradas con TypeOrmModule.forFeature()
        // en cada módulo, sin tener que listarlas aquí una por una.
        autoLoadEntities: true,
        // Crea/actualiza las tablas a partir de las entidades. Cómodo en desarrollo;
        // en producción conviene ponerlo en false y usar migraciones.
        synchronize: config.get('DB_SYNCHRONIZE', 'true') !== 'false',
      }),
    }),

    // Módulo con todo lo de los registros: entidad, servicio y controlador.
    RegistrosModule,
  ],
})
export class AppModule {}
