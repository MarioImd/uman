export interface RegistroAtencionPrehospitalaria {
  id: string;
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

  // Tablas repetibles (una fila = un Record<claveColumna, valor>)
  signosVitales: Record<string, unknown>[];
  manejoFarmacologico: Record<string, unknown>[];
  vehiculosInvolucrados: Record<string, unknown>[];

  // Material utilizado: clave del ítem del catálogo -> { marcado, cantidad? }
  materialUtilizado: Record<string, { marcado: boolean; cantidad?: string }>;
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
    signosVitales: [],
    manejoFarmacologico: [],
    vehiculosInvolucrados: [],
    materialUtilizado: {},
  };
}
