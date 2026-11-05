export interface RegistroAtencionPrehospitalaria {
  id: string;
  /** Versión del servidor; detecta si otra persona cambió el registro. 0 o ausente = nuevo. */
  version?: number;
  fechaCreacion: string;
  estado: string;
  ciudad: string;
  folio: string;

  // Secciones cuyos campos vienen de secciones.data.ts (Record<clave, valor>)
  datosServicio: Record<string, unknown>;
  control: Record<string, unknown>;
  datosPaciente: Record<string, unknown>;
  causaTraumatica: Record<string, unknown>;
  causaClinica: Record<string, unknown>;
  parto: Record<string, unknown>;
  evaluacionInicial: Record<string, unknown>;
  evaluacionSecundaria: Record<string, unknown>;
  anamnesis: Record<string, unknown>;
  tratamiento: Record<string, unknown>;
  traslado: Record<string, unknown>;
  observaciones: Record<string, unknown>;
  datosLegales: Record<string, unknown>;
  hospitalReceptor: Record<string, unknown>;
  consentimientoInformado: Record<string, unknown>;

  // Tablas repetibles (una fila = un Record<claveColumna, valor>)
  signosVitales: Record<string, unknown>[];
  manejoFarmacologico: Record<string, unknown>[];
  vehiculosInvolucrados: Record<string, unknown>[];
}

/** Fila ligera del Historial: lo que devuelve la lista, sin secciones ni imágenes. */
export interface RegistroResumen {
  id: string;
  folio: string;
  ciudad: string;
  paciente: string;
  fechaCreacion: string;
}

/** Una página de resultados del servidor. */
export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export function crearRegistroVacio(): RegistroAtencionPrehospitalaria {
  return {
    id: crypto.randomUUID(),
    fechaCreacion: new Date().toISOString(),
    estado: '',
    ciudad: '',
    folio: '',
    datosServicio: {},
    control: {},
    datosPaciente: {},
    causaTraumatica: {},
    causaClinica: {},
    parto: {},
    evaluacionInicial: {},
    evaluacionSecundaria: {},
    anamnesis: {},
    tratamiento: {},
    traslado: {},
    observaciones: {},
    datosLegales: {},
    hospitalReceptor: {},
    consentimientoInformado: {},
    signosVitales: [],
    manejoFarmacologico: [],
    vehiculosInvolucrados: [],
  };
}
