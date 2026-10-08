export type TipoCampo =
  | 'texto'
  | 'numero'
  | 'fecha'
  | 'hora'
  | 'textarea'
  | 'checkbox'
  | 'checkbox-grupo'
  | 'radio-grupo'
  | 'select'
  | 'imagenes'
  | 'firma';

export interface CampoFormulario {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones?: string[];
  sufijo?: string;
  /**
   * Solo para tipo 'texto': restringe lo que se puede escribir.
   *  - 'letras': nombres de personas/lugares (letras con acentos, espacios, punto, coma, guion).
   *  - 'digitos': solo números sin signo ni punto (p. ej. teléfono).
   */
  formato?: 'letras' | 'digitos';
  /** Máximo de caracteres (tipo 'texto'). */
  maxLongitud?: number;
  /** Solo para tipo 'numero': rango permitido; fuera de él el campo se marca en rojo. */
  min?: number;
  max?: number;
  /** Solo para tipo 'numero': no acepta decimales (edades, escalas, conteos). */
  entero?: boolean;
}

export interface TablaRepetible {
  clave: string;
  titulo: string;
  columnas: CampoFormulario[];
}

export interface SeccionFormulario {
  clave: string;
  titulo: string;
  campos: CampoFormulario[];
  tablas?: TablaRepetible[];
}
