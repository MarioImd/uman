/**
 * Módulo de registros: agrupa la entidad (tabla), el servicio (lógica de
 * acceso a datos) y el controlador (rutas HTTP) de los Registros de
 * Atención Prehospitalaria. AppModule lo importa para activarlo.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registro } from './registro.entity';
import { RegistrosController } from './registros.controller';
import { RegistrosService } from './registros.service';

@Module({
  // Registra la entidad Registro en este módulo; esto es lo que permite
  // inyectar su Repository en RegistrosService con @InjectRepository.
  imports: [TypeOrmModule.forFeature([Registro])],
  // Clases que reciben las peticiones HTTP.
  controllers: [RegistrosController],
  // Clases que NestJS crea e inyecta donde se necesiten (inyección de dependencias).
  providers: [RegistrosService],
})
export class RegistrosModule {}
