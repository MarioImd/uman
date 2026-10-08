import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { GuardarRegistroDto } from './dto/guardar-registro.dto';
import { RegistrosService } from './registros.service';

/**
 * Controlador HTTP: define las rutas de /api/registros y qué método del
 * servicio atiende cada una. Aquí solo se reciben y validan las peticiones;
 * el trabajo con la base de datos lo hace RegistrosService.
 *
 * ParseUUIDPipe en los :id hace que un id mal formado responda 400 sin
 * llegar a consultar la base de datos.
 */
@Controller('registros')
export class RegistrosController {
  constructor(private readonly registros: RegistrosService) {}

  /** GET /api/registros → lista todos los registros (la usa el Historial y el formulario al iniciar). */
  @Get()
  listar() {
    return this.registros.listar();
  }

  /** GET /api/registros/:id → un registro, o 404 si no existe. */
  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.registros.obtener(id);
  }

  /**
   * PUT /api/registros/:id → crea o actualiza el registro (autoguardado).
   * Se usa PUT y no POST porque el id ya viene del frontend: "guarda este
   * registro en esta dirección". @Body() ya llega validado contra el DTO.
   */
  @Put(':id')
  guardar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GuardarRegistroDto) {
    // Evita guardar por error el contenido de un registro sobre otro.
    if (dto.id !== id) throw new BadRequestException('El id del cuerpo no coincide con el de la URL');
    return this.registros.guardar(dto);
  }

  /** DELETE /api/registros/:id → elimina el registro y responde 204 (sin contenido). */
  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.registros.eliminar(id);
  }
}
