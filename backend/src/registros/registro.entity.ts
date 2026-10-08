import { Column, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Contenido de una sección: { claveDelCampo: valor }, tal como lo manda el frontend. */
type Seccion = Record<string, unknown>;

/**
 * Un "Registro de Atención Prehospitalaria". Cada propiedad decorada con
 * @Column se convierte en una columna de la tabla `registros` en Postgres.
 *
 * Los campos de cada sección se definen dinámicamente en el frontend
 * (secciones.data.ts), así que cada sección se guarda como JSONB en vez de
 * una columna por campo: agregar o quitar campos en el formulario no
 * requiere cambiar la base de datos. JSONB además permite consultar dentro
 * del JSON con SQL si algún día se necesita (p. ej. buscar por nombre de paciente).
 *
 * Las propiedades tienen los mismos nombres que la interfaz
 * RegistroAtencionPrehospitalaria del frontend (registro.model.ts), así el
 * JSON que va y viene es exactamente el mismo.
 */
@Entity('registros')
export class Registro {
  // Llave primaria. El id (UUID) lo genera el frontend al crear el borrador,
  // por eso es PrimaryColumn y no PrimaryGeneratedColumn.
  @PrimaryColumn('uuid')
  id: string;

  // Cuándo se creó el registro (lo manda el frontend). Indexado porque la
  // lista se ordena por esta fecha.
  @Index()
  @Column({ type: 'timestamptz' })
  fechaCreacion: Date;

  // La llena TypeORM sola cada vez que se guarda el registro; sirve para
  // saber cuándo fue la última modificación.
  @UpdateDateColumn({ type: 'timestamptz' })
  fechaActualizacion: Date;

  // Datos generales (sección I). Viven como columnas normales en vez de JSONB
  // porque son los más útiles para buscar/filtrar.
  @Column({ default: '' })
  estado: string;

  @Column({ default: '' })
  ciudad: string;

  @Index()
  @Column({ default: '' })
  folio: string;

  // Secciones del formulario (II a XVII), una columna JSONB por sección.
  // default: {} para que un registro recién creado nunca tenga null aquí.
  @Column({ type: 'jsonb', default: {} }) datosServicio: Seccion;
  @Column({ type: 'jsonb', default: {} }) control: Seccion;
  @Column({ type: 'jsonb', default: {} }) datosPaciente: Seccion;
  @Column({ type: 'jsonb', default: {} }) causaTraumatica: Seccion;
  @Column({ type: 'jsonb', default: {} }) causaClinica: Seccion;
  @Column({ type: 'jsonb', default: {} }) parto: Seccion;
  @Column({ type: 'jsonb', default: {} }) evaluacionInicial: Seccion;
  @Column({ type: 'jsonb', default: {} }) evaluacionSecundaria: Seccion;
  @Column({ type: 'jsonb', default: {} }) anamnesis: Seccion;
  @Column({ type: 'jsonb', default: {} }) tratamiento: Seccion;
  @Column({ type: 'jsonb', default: {} }) traslado: Seccion;
  @Column({ type: 'jsonb', default: {} }) observaciones: Seccion;
  @Column({ type: 'jsonb', default: {} }) datosLegales: Seccion;
  @Column({ type: 'jsonb', default: {} }) hospitalReceptor: Seccion;
  @Column({ type: 'jsonb', default: {} }) consentimientoInformado: Seccion;

  // Tablas repetibles: arreglo JSONB donde una fila = un objeto { claveColumna: valor }.
  @Column({ type: 'jsonb', default: [] }) signosVitales: Seccion[];
  @Column({ type: 'jsonb', default: [] }) manejoFarmacologico: Seccion[];
  @Column({ type: 'jsonb', default: [] }) vehiculosInvolucrados: Seccion[];
}
