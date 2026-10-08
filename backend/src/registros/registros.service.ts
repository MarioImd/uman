import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuardarRegistroDto } from './dto/guardar-registro.dto';
import { Registro } from './registro.entity';

/**
 * Lógica de acceso a datos de los registros. El controlador no habla con la
 * base de datos directamente: llama a estos métodos, que usan el Repository
 * de TypeORM (un objeto que ya sabe hacer SELECT/INSERT/UPDATE/DELETE sobre
 * la tabla `registros`).
 *
 * Los métodos equivalen 1 a 1 a la interfaz RegistroService del frontend
 * (listar, obtener, guardar, eliminar).
 */
@Injectable()
export class RegistrosService {
  // NestJS inyecta aquí el Repository de la entidad Registro (registrado en
  // RegistrosModule con TypeOrmModule.forFeature).
  constructor(@InjectRepository(Registro) private readonly repo: Repository<Registro>) {}

  /**
   * Todos los registros, del más antiguo al más reciente. El orden importa:
   * el formulario toma el último de la lista como "borrador en curso" al abrir la app.
   */
  listar(): Promise<Registro[]> {
    return this.repo.find({ order: { fechaCreacion: 'ASC' } });
  }

  /** Un registro por id; si no existe lanza NotFoundException (NestJS responde 404). */
  async obtener(id: string): Promise<Registro> {
    const registro = await this.repo.findOneBy({ id });
    if (!registro) throw new NotFoundException(`Registro ${id} no encontrado`);
    return registro;
  }

  /**
   * Crea o actualiza ("upsert"): el frontend autoguarda el mismo id una y otra
   * vez mientras se llena el formulario. repo.save() busca el id; si no existe
   * hace INSERT y si existe hace UPDATE. La fecha llega como texto ISO y se
   * convierte a Date para la columna timestamptz.
   */
  guardar(dto: GuardarRegistroDto): Promise<Registro> {
    return this.repo.save({ ...dto, fechaCreacion: new Date(dto.fechaCreacion) });
  }

  /** Borra el registro. Si el id no existe no hace nada (no es error). */
  async eliminar(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
