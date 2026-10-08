import { IsArray, IsDateString, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

/** Contenido de una sección: { claveDelCampo: valor }. */
type Seccion = Record<string, unknown>;

/**
 * DTO (Data Transfer Object): describe qué forma debe tener el JSON que el
 * frontend manda en PUT /api/registros/:id. El ValidationPipe global (main.ts)
 * revisa cada petición contra estas reglas antes de que llegue al controlador:
 * si algo no cumple responde 400, y cualquier propiedad que no esté declarada
 * aquí se descarta (whitelist).
 *
 * Los decoradores son de class-validator:
 *  - @IsOptional: la propiedad puede no venir.
 *  - @IsString / @IsObject / @IsArray / @IsUUID / @IsDateString: si viene,
 *    debe ser de ese tipo.
 *
 * El contenido de cada sección no se valida campo por campo a propósito: los
 * campos los define el frontend (secciones.data.ts) y cambian seguido.
 */
export class GuardarRegistroDto {
  // Obligatorio: identifica el registro (lo genera el frontend).
  @IsUUID()
  id: string;

  // Obligatorio: fecha en formato ISO 8601, p. ej. "2026-10-08T21:26:39.635Z".
  @IsDateString()
  fechaCreacion: string;

  // Datos generales.
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() ciudad?: string;
  @IsOptional() @IsString() folio?: string;

  // Secciones: cada una debe ser un objeto.
  @IsOptional() @IsObject() datosServicio?: Seccion;
  @IsOptional() @IsObject() control?: Seccion;
  @IsOptional() @IsObject() datosPaciente?: Seccion;
  @IsOptional() @IsObject() causaTraumatica?: Seccion;
  @IsOptional() @IsObject() causaClinica?: Seccion;
  @IsOptional() @IsObject() parto?: Seccion;
  @IsOptional() @IsObject() evaluacionInicial?: Seccion;
  @IsOptional() @IsObject() evaluacionSecundaria?: Seccion;
  @IsOptional() @IsObject() anamnesis?: Seccion;
  @IsOptional() @IsObject() tratamiento?: Seccion;
  @IsOptional() @IsObject() traslado?: Seccion;
  @IsOptional() @IsObject() observaciones?: Seccion;
  @IsOptional() @IsObject() datosLegales?: Seccion;
  @IsOptional() @IsObject() hospitalReceptor?: Seccion;
  @IsOptional() @IsObject() consentimientoInformado?: Seccion;

  // Tablas repetibles: arreglo cuyos elementos (filas) deben ser objetos.
  @IsOptional() @IsArray() @IsObject({ each: true }) signosVitales?: Seccion[];
  @IsOptional() @IsArray() @IsObject({ each: true }) manejoFarmacologico?: Seccion[];
  @IsOptional() @IsArray() @IsObject({ each: true }) vehiculosInvolucrados?: Seccion[];
}
